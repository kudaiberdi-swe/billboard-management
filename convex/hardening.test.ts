/// <reference types="vite/client" />
// Pre-deploy hardening: regression tests for the security-audit leads KI-03..KI-08 (docs/KNOWN-ISSUES.md).
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply.
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";
import { SWEEP_MAX_PAGES, SWEEP_PAGE } from "./campaigns";
import { SESSION_PAGE } from "./demo";
import { normalizeKey, rateLimiter } from "./rateLimits";
import { LOG_ROW_BUDGET } from "./showLog";
import { datesInRange, isDate, requireDate } from "./lib/time";

const modules = import.meta.glob("./**/*.*s");
const PASSWORD = "synthetic-demo-password-for-tests";
const HOUR = 3_600_000;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/** Sets the clock to `date` at `hour` in UTC+5; `all` also fakes timers so scheduled functions can be drained. */
function clock(date: string, hour: number, all = false) {
  vi.useFakeTimers(all ? undefined : { toFake: ["Date"] });
  vi.setSystemTime(Date.parse(`${date}T00:00:00Z`) + (hour - 5) * HOUR);
}

async function seeded() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.mutation(internal.demo.seed, {});
  vi.stubEnv("DEMO_PASSWORD", PASSWORD);
  const sessionId = crypto.randomUUID();
  expect(await t.mutation(api.demo.signIn, { sessionId, password: PASSWORD })).toEqual({ ok: true });
  return { t, sessionId };
}
type T = Awaited<ReturnType<typeof seeded>>["t"];

async function errorCode(call: Promise<unknown>): Promise<string> {
  try {
    await call;
  } catch (e) {
    if (e instanceof ConvexError) return (e.data as { code: string }).code;
    throw e;
  }
  throw new Error("expected the call to fail");
}

const screensOf = (t: T) => t.run((ctx) => ctx.db.query("screens").withIndex("by_code").collect());
const regular = (screens: Doc<"screens">[]) =>
  screens.filter((s) => s.status === "online" && s.workStartHour === 7 && s.workEndHour === 23);
const insertCampaign = (t: T, screenIds: Id<"screens">[], startDate: string, endDate: string, startHour = 8, endHour = 20) =>
  t.run((ctx) =>
    ctx.db.insert("campaigns", {
      name: "Demo Hardening",
      advertiser: "Demo Test",
      startDate,
      endDate,
      startHour,
      endHour,
      slotsPerCycle: 1,
      screenIds,
      creative: { kind: "placeholder", key: "placeholder-1" },
    }),
  );

// ---------- KI-05: dates outside the product window ----------

test("[pre-deploy-hardening] KI-05 date helpers accept only years 2000-2100 and never loop past the range", () => {
  expect(isDate("2000-01-01")).toBe(true);
  expect(isDate("2100-12-31")).toBe(true);
  expect(isDate("1999-12-31")).toBe(false);
  expect(isDate("2101-01-01")).toBe(false);
  expect(isDate("9999-12-31")).toBe(false);
  expect(() => requireDate("9999-12-31", "to")).toThrow(ConvexError);
  expect(datesInRange("9999-12-31", "9999-12-31")).toEqual(["9999-12-31"]); // bounded by the day count
  expect(datesInRange("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  expect(datesInRange("2026-11-02", "2026-10-30")).toEqual([]);
});

test("[pre-deploy-hardening] KI-05 from=to=9999-12-31 is refused with INVALID_INPUT by every date entry point", async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const screens = await screensOf(t);
  const camera = screens.find((s) => s.hasCamera)!;
  const far = "9999-12-31";
  const request = { startDate: far, endDate: far, startHour: 8, endHour: 9, slotsPerCycle: 1, screenIds: [screens[0]._id] };
  expect(await errorCode(t.query(api.analytics.screenPeriod, { sessionId, screenId: camera._id, from: far, to: far }))).toBe(
    "INVALID_INPUT",
  );
  expect(await errorCode(t.query(api.dashboard.summary, { sessionId, from: far, to: far }))).toBe("INVALID_INPUT");
  expect(await errorCode(t.query(api.campaigns.checkAvailability, { sessionId, ...request }))).toBe("INVALID_INPUT");
  const before = await t.run((ctx) => ctx.db.query("campaigns").collect());
  expect(
    await errorCode(
      t.mutation(api.campaigns.create, {
        sessionId,
        ...request,
        name: "Demo Far",
        advertiser: "Demo Test",
        creative: { kind: "placeholder", key: "placeholder-1" },
      }),
    ),
  ).toBe("INVALID_INPUT");
  expect(await t.run((ctx) => ctx.db.query("campaigns").collect())).toHaveLength(before.length);
});

// ---------- KI-08: CPU at MAX_CAMPAIGNS ----------

test("[pre-deploy-hardening] KI-08 screens.list and campaigns.list stay fast at 200 campaigns on 100 screens", async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const ids = (await screensOf(t)).map((s) => s._id);
  // Direct inserts, one 366-day campaign per year (no slot check needed for the read cost).
  const existing = (await t.run((ctx) => ctx.db.query("campaigns").collect())).length;
  for (let i = existing; i < 200; i += 1) await insertCampaign(t, ids, `${2001 + (i % 90)}-01-01`, `${2001 + (i % 90)}-12-31`);
  const t0 = performance.now(); // only Date is faked
  const list = await t.query(api.screens.list, { sessionId });
  const screensMs = performance.now() - t0;
  const t1 = performance.now();
  const campaigns = await t.query(api.campaigns.list, { sessionId });
  const campaignsMs = performance.now() - t1;
  expect(list.rows).toHaveLength(100);
  expect(campaigns).toHaveLength(200);
  // Measured on the dev laptop: before the fix ~320 ms and ~2 100 ms (index rebuilt per screen, days × screens plan
  // loop); after ~25 ms and ~160 ms. The bounds leave room for a loaded test runner.
  expect(screensMs).toBeLessThan(150);
  expect(campaignsMs).toBeLessThan(800);
}, 60_000);

// ---------- KI-04: the show log stays under the read limit ----------

test("[pre-deploy-hardening] KI-04 simulate keeps all log rows within LOG_ROW_BUDGET", async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const [s1, s2] = regular(await screensOf(t));
  const other = (await t.run((ctx) => ctx.db.query("campaigns").first()))!;
  const existing = (await t.run((ctx) => ctx.db.query("showLog").collect())).length;
  // Fill the log so 3 days of a 2-screen campaign still fit.
  const filler = LOG_ROW_BUDGET - existing - 2 * 3;
  for (let i = 0; i < filler; i += 2000) {
    await t.run(async (ctx) => {
      for (let j = i; j < Math.min(filler, i + 2000); j += 1) {
        await ctx.db.insert("showLog", { campaignId: other._id, screenId: s1._id, date: "2026-01-01", shows: 0 });
      }
    });
  }
  const campaignId = await insertCampaign(t, [s1._id, s2._id], "2026-10-01", "2026-10-31");
  const result = await t.mutation(api.showLog.simulate, { sessionId, campaignId });
  expect(result).toEqual({ rows: 6, from: "2026-10-26", to: "2026-10-28" });
  expect(await t.run(async (ctx) => (await ctx.db.query("showLog").collect()).length)).toBe(LOG_ROW_BUDGET);

  // Rerun of the same campaign: its own rows do not count against it.
  expect(await t.mutation(api.showLog.simulate, { sessionId, campaignId })).toEqual(result);

  // A full log refuses a new run and writes nothing.
  const full = await insertCampaign(t, [s1._id], "2026-10-01", "2026-10-31");
  expect(await errorCode(t.mutation(api.showLog.simulate, { sessionId, campaignId: full }))).toBe("INVALID_INPUT");
  expect(
    await t.run((ctx) => ctx.db.query("showLog").withIndex("by_campaign", (q) => q.eq("campaignId", full)).collect()),
  ).toEqual([]);
}, 120_000);

test("[pre-deploy-hardening] KI-04 dashboard log shows count only the selection, as before", async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const all = await t.query(api.dashboard.summary, { sessionId, from: "2026-10-01", to: "2026-10-28" });
  const rows = await t.run((ctx) =>
    ctx.db.query("showLog").withIndex("by_date", (q) => q.gte("date", "2026-10-01").lte("date", "2026-10-28")).collect(),
  );
  expect(all.logShows).toBe(rows.reduce((sum, r) => sum + r.shows, 0));
  expect(all.logShows).toBeGreaterThan(0);
  const screenId = rows[0].screenId;
  const one = await t.query(api.dashboard.summary, { sessionId, from: "2026-10-01", to: "2026-10-28", screenId });
  expect(one.logShows).toBe(rows.filter((r) => r.screenId === screenId).reduce((sum, r) => sum + r.shows, 0));
});

// ---------- KI-03: orphan upload sweep walks the whole backlog ----------

test("[pre-deploy-hardening] KI-03 orphan sweep pages past referenced files until no old orphan is left", async () => {
  clock("2026-10-28", 11, true);
  const { t, sessionId } = await seeded();
  const store = () => t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(16)], { type: "video/mp4" })));
  const used: Id<"_storage">[] = [];
  for (let i = 0; i < 3; i += 1) {
    const storageId = await store();
    used.push(storageId);
    const [s] = regular(await screensOf(t));
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        name: `Demo Video ${i}`,
        advertiser: "Demo Test",
        startDate: "2026-11-10",
        endDate: "2026-11-10",
        startHour: i,
        endHour: i + 1,
        slotsPerCycle: 1,
        screenIds: [s._id],
        creative: { kind: "video", storageId },
      }),
    );
  }
  const orphans = SWEEP_PAGE + 230; // the 730/day backlog of the audit: more than one page
  for (let i = 0; i < orphans; i += 100) {
    await t.run(async (ctx) => {
      for (let j = 0; j < 100 && i + j < orphans; j += 1) await ctx.storage.store(new Blob([new Uint8Array(16)]));
    });
  }
  vi.setSystemTime(Date.now() + 25 * HOUR);
  const fresh = await store();
  expect(await t.mutation(internal.campaigns.sweepOrphanUploads, {})).toBe(SWEEP_PAGE - used.length);
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const left = await t.run(async (ctx) => (await ctx.db.system.query("_storage").collect()).map((f) => f._id));
  expect(left.sort()).toEqual([...used, fresh].sort());
  expect(SWEEP_MAX_PAGES * SWEEP_PAGE).toBeGreaterThan(730 + 200);
  expect(sessionId).toBeTruthy();
}, 60_000);

// ---------- KI-06: expired sessions and old rate-limit rows ----------

test("[pre-deploy-hardening] KI-06 daily purge deletes only expired sessions, page by page", async () => {
  clock("2026-10-28", 11, true);
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const now = Date.now();
  const total = SESSION_PAGE * 2 + 10;
  await t.run(async (ctx) => {
    for (let i = 0; i < total; i += 1) {
      await ctx.db.insert("demoSessions", { sessionId: crypto.randomUUID(), expiresAt: i % 2 === 0 ? now - 1 : now + HOUR });
    }
  });
  await t.mutation(internal.demo.purgeExpiredSessions, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const left = await t.run((ctx) => ctx.db.query("demoSessions").collect());
  expect(left).toHaveLength(total / 2);
  expect(left.every((s) => s.expiresAt > now)).toBe(true);
});

test("[pre-deploy-hardening] KI-06 daily cleanup drops rate-limit rows older than 1 hour", async () => {
  clock("2026-10-28", 11, true);
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  vi.stubEnv("DEMO_PASSWORD", PASSWORD);
  const old = crypto.randomUUID();
  await t.mutation(api.demo.signIn, { sessionId: old, password: "wrong" });
  vi.setSystemTime(Date.now() + 2 * HOUR);
  const recent = crypto.randomUUID();
  await t.mutation(api.demo.signIn, { sessionId: recent, password: "wrong" });
  const stamp = (key: string) =>
    t.run(async (ctx) => (await rateLimiter.getValue(ctx, "signInPerAccount", { key: normalizeKey(key) })).ts);
  expect(await stamp(old)).toBeGreaterThan(0);
  await t.mutation(internal.demo.clearOldRateLimits, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await stamp(old)).toBe(0); // row gone: a missing row reads as ts 0
  expect(await stamp(recent)).toBeGreaterThan(0);
});
