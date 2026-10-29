/// <reference types="vite/client" />
// f10-simulate-shows: showLog.simulate against the seed on a fixed clock (fake Date only).
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply.
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";
import { plannedShowsForDay } from "./lib/slots";
import { campaignStatus } from "./lib/status";
import { addDays, kzNow } from "./lib/time";

const modules = import.meta.glob("./**/*.*s");
const PASSWORD = "synthetic-demo-password-for-tests";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/** Sets the clock to `date` at `hour` in UTC+5. */
function clock(date: string, hour: number) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse(`${date}T00:00:00Z`) + (hour - 5) * 3_600_000);
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

const screensOf = (t: T) => t.run((ctx) => ctx.db.query("screens").collect());
const allLog = (t: T) => t.run((ctx) => ctx.db.query("showLog").collect());
const logOf = (t: T, campaignId: Id<"campaigns">) =>
  t.run((ctx) => ctx.db.query("showLog").withIndex("by_campaign", (q) => q.eq("campaignId", campaignId)).collect());
const byName = (t: T, name: string) =>
  t.run(async (ctx) => (await ctx.db.query("campaigns").collect()).find((c) => c.name === name)!);

/** A campaign written directly (no slot check needed: the log rule reads only this campaign). */
const addCampaign = (t: T, screenIds: Id<"screens">[], startDate: string, endDate: string, startHour = 8, endHour = 20) =>
  t.run((ctx) =>
    ctx.db.insert("campaigns", {
      name: "Demo Simulate",
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

/** Online screens open 07:00–23:00, so show hours 08:00–20:00 are inside working hours. */
const regular = (screens: Doc<"screens">[]) =>
  screens.filter((s) => s.status === "online" && s.workStartHour === 7 && s.workEndHour === 23);

const dates = (rows: Doc<"showLog">[]) => [...new Set(rows.map((r) => r.date))].sort();
const days = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

test("[f10-simulate-shows] no log after today", async () => {
  clock("2026-10-31", 10);
  const { t, sessionId } = await seeded();
  const [s1, s2] = regular(await screensOf(t));
  const campaignId = await addCampaign(t, [s1._id, s2._id], "2026-10-25", "2026-11-10");
  const result = await t.mutation(api.showLog.simulate, { sessionId, campaignId });
  const rows = await logOf(t, campaignId);
  expect(result).toEqual({ rows: rows.length, from: "2026-10-25", to: "2026-10-31" });
  expect(dates(rows)).toEqual(days("2026-10-25", "2026-10-31"));
  const c = (await t.run((ctx) => ctx.db.get(campaignId)))!;
  for (const r of rows.filter((r) => r.date === "2026-10-31")) {
    const s = [s1, s2].find((s) => s._id === r.screenId)!;
    // Hours 08 and 09 only: more than one hour of plan, never more than two.
    expect(r.shows).toBeLessThanOrEqual(plannedShowsForDay(c, s, r.date, 10));
    expect(r.shows).toBeGreaterThan(plannedShowsForDay(c, s, r.date, 9));
  }
});

test("[f10-simulate-shows] today counts finished hours only", async () => {
  clock("2026-10-31", 8);
  const { t, sessionId } = await seeded();
  const [s1] = regular(await screensOf(t));
  const campaignId = await addCampaign(t, [s1._id], "2026-10-29", "2026-11-10");
  await t.mutation(api.showLog.simulate, { sessionId, campaignId });
  const today = (await logOf(t, campaignId)).filter((r) => r.date === "2026-10-31");
  expect(today).toHaveLength(1);
  expect(today[0].shows).toBe(0);
});

test("[f10-simulate-shows] no log on offline screens", async () => {
  clock("2026-10-31", 12);
  const { t, sessionId } = await seeded();
  const screens = await screensOf(t);
  const offline = screens.find((s) => s.status === "offline")!;
  const [online] = regular(screens);
  const campaignId = await addCampaign(t, [offline._id, online._id], "2026-10-28", "2026-11-03");
  await t.mutation(api.showLog.simulate, { sessionId, campaignId });
  const rows = await logOf(t, campaignId);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.some((r) => r.screenId === offline._id)).toBe(false);
});

test("[f10-simulate-shows] rerun replaces the log", async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const c = await byName(t, "Летняя акция");
  const others = (await allLog(t)).filter((r) => r.campaignId !== c._id);
  const strip = (rows: Doc<"showLog">[]) => rows.map(({ screenId, date, shows }) => ({ screenId, date, shows }));
  await t.mutation(api.showLog.simulate, { sessionId, campaignId: c._id });
  const first = strip(await logOf(t, c._id));
  await t.mutation(api.showLog.simulate, { sessionId, campaignId: c._id });
  expect(first.length).toBeGreaterThan(0);
  expect(strip(await logOf(t, c._id))).toEqual(first);
  expect((await allLog(t)).filter((r) => r.campaignId !== c._id)).toEqual(others);
});

test("[f10-simulate-shows] log never exceeds plan after simulate", async () => {
  clock("2026-10-28", 15);
  const { t, sessionId } = await seeded();
  const now = kzNow(Date.now());
  const screens = await screensOf(t);
  const campaigns = await t.run((ctx) => ctx.db.query("campaigns").collect());
  const started = campaigns.filter((c) => campaignStatus(c, now.date) !== "planned");
  expect(started.length).toBeGreaterThan(3);
  for (const c of started) {
    await t.mutation(api.showLog.simulate, { sessionId, campaignId: c._id });
    const rows = await logOf(t, c._id);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const s = screens.find((s) => s._id === r.screenId)!;
      expect(r.shows).toBeLessThanOrEqual(plannedShowsForDay(c, s, r.date, r.date === now.date ? now.hour : undefined));
    }
    const card = await t.query(api.campaigns.get, { sessionId, campaignId: c._id });
    expect(card.logShows).toBeLessThanOrEqual(card.plannedShows);
  }
});

test("[f10-simulate-shows] simulated period is capped at 31 days", async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const [s1] = regular(await screensOf(t));
  const campaignId = await addCampaign(t, [s1._id], "2026-08-01", "2026-12-31");
  const result = await t.mutation(api.showLog.simulate, { sessionId, campaignId });
  expect(dates(await logOf(t, campaignId))).toEqual(days("2026-09-28", "2026-10-28"));
  expect(result).toMatchObject({ from: "2026-09-28", to: "2026-10-28" });
});

test("[f10-simulate-shows] finished campaign keeps its last 31 days", async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const [s1] = regular(await screensOf(t));
  const campaignId = await addCampaign(t, [s1._id], "2026-07-01", "2026-09-30");
  const result = await t.mutation(api.showLog.simulate, { sessionId, campaignId });
  expect(dates(await logOf(t, campaignId))).toEqual(days("2026-08-31", "2026-09-30"));
  expect(result).toMatchObject({ from: "2026-08-31", to: "2026-09-30" });
});

const readersGetNewValues = async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const c = await byName(t, "Презентация автомобиля");
  clock(addDays(c.startDate, 1), 14); // after its start date, inside the 7-day session
  await t.mutation(api.showLog.simulate, { sessionId, campaignId: c._id });
  const rows = await logOf(t, c._id);
  expect(rows.length).toBeGreaterThan(0);
  const card = await t.query(api.campaigns.get, { sessionId, campaignId: c._id });
  expect(card.logShows).toBe(rows.reduce((sum, r) => sum + r.shows, 0));
  expect(card.logShows).toBeGreaterThan(0);
  // «Главная» and «Отчёты» read the rows by campaign: both count exactly the written rows of this campaign.
  const today = kzNow(Date.now()).date;
  const written = rows.reduce((sum, r) => sum + r.shows, 0);
  const report = await t.query(api.reports.campaign, { sessionId, campaignId: c._id });
  expect(report.placement.logShows).toBe(written);
  const screenId = rows[0].screenId;
  const home = await t.query(api.dashboard.summary, { sessionId, from: c.startDate, to: today, screenId });
  const others = (await allLog(t)).filter((r) => r.campaignId !== c._id && r.screenId === screenId && r.date >= c.startDate && r.date <= today);
  const ownOnScreen = rows.filter((r) => r.screenId === screenId).reduce((sum, r) => sum + r.shows, 0);
  expect(home.logShows).toBe(ownOnScreen + others.reduce((sum, r) => sum + r.shows, 0));
};
test("[f10-simulate-shows] new log values reach the readers", readersGetNewValues);
test("[c00-predeploy-hardening] new log values reach the readers", readersGetNewValues);

const deletedRefused = async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const old = await byName(t, "Летняя акция");
  await t.mutation(api.demo.reset, { sessionId });
  const before = await allLog(t);
  expect(await errorCode(t.mutation(api.showLog.simulate, { sessionId, campaignId: old._id }))).toBe("NOT_FOUND");
  expect(await logOf(t, old._id)).toEqual([]);
  expect(await allLog(t)).toEqual(before);
};
test("[f10-simulate-shows] deleted campaign is refused", deletedRefused);
test("[c00-predeploy-hardening] deleted campaign is refused", deletedRefused);

const noSessionRefused = async () => {
  clock("2026-10-28", 11);
  const { t } = await seeded();
  const c = await byName(t, "Летняя акция");
  const expired = crypto.randomUUID();
  await t.mutation(api.demo.signIn, { sessionId: expired, password: PASSWORD });
  clock("2026-11-05", 11); // past the 7-day session
  const before = await allLog(t);
  expect(before.some((r) => r.campaignId === c._id)).toBe(true);
  for (const sessionId of [crypto.randomUUID(), "", "not-a-session", expired]) {
    expect(await errorCode(t.mutation(api.showLog.simulate, { sessionId, campaignId: c._id }))).toBe("UNAUTHENTICATED");
  }
  expect(await allLog(t)).toEqual(before);
};
test("[f10-simulate-shows] simulate without session is refused", noSessionRefused);
test("[c00-predeploy-hardening] simulate without session is refused", noSessionRefused);

const notStartedRefused = async () => {
  clock("2026-10-28", 11);
  const { t, sessionId } = await seeded();
  const c = await byName(t, "Презентация автомобиля");
  expect(campaignStatus(c, "2026-10-28")).toBe("planned");
  const before = await allLog(t);
  expect(await errorCode(t.mutation(api.showLog.simulate, { sessionId, campaignId: c._id }))).toBe("CAMPAIGN_NOT_STARTED");
  expect((await t.query(api.campaigns.get, { sessionId, campaignId: c._id })).logShows).toBe(0);
  expect(await allLog(t)).toEqual(before);
};
test("[f10-simulate-shows] not started campaign is refused", notStartedRefused);
test("[c00-predeploy-hardening] not started campaign is refused", notStartedRefused);
