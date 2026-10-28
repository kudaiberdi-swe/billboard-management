/// <reference types="vite/client" />
// reports scenarios of f09-reports (backend-observable part). Synthetic seed only.
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply;
// the record-id args (campaignId, screenId) are checked for unknown, malformed and foreign ids.
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { audienceDay } from "./lib/analytics";
import { estimateContacts } from "./lib/contacts";
import { plannedShows } from "./lib/slots";
import { addDays, datesInRange } from "./lib/time";
import { seedData } from "./seed";

const modules = import.meta.glob("./**/*.*s");
const TODAY = "2026-10-31";
const NOW = Date.parse(`${TODAY}T07:00:00Z`); // 12:00 UTC+5

function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}
type T = ReturnType<typeof setup>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

async function session(t: T) {
  const sessionId = crypto.randomUUID();
  await t.run((ctx) => ctx.db.insert("demoSessions", { sessionId, expiresAt: Date.now() + 7 * 86_400_000 }));
  return sessionId;
}

// One seeded backend shared by the read-only tests (the query writes nothing); a test that writes passes fresh = true.
let shared: ReturnType<typeof seedFresh> | undefined;
const seeded = (fresh = false) => (fresh ? seedFresh() : (shared ??= seedFresh()));

async function seedFresh() {
  const t = setup();
  await t.run((ctx) => seedData(ctx, TODAY));
  const sessionId = await session(t);
  const data = await t.run(async (ctx) => ({
    screens: await ctx.db.query("screens").collect(),
    campaigns: await ctx.db.query("campaigns").collect(),
    showLog: await ctx.db.query("showLog").collect(),
  }));
  const summer = data.campaigns.find((c) => c.name === "Летняя акция")!;
  const own = data.screens.filter((s) => summer.screenIds.includes(s._id)).sort((a, b) => a.code.localeCompare(b.code));
  return { t, sessionId, data, summer, own };
}

async function errorData(call: Promise<unknown>): Promise<Record<string, unknown>> {
  try {
    await call;
  } catch (e) {
    if (e instanceof ConvexError) return e.data as Record<string, unknown>;
    throw e;
  }
  throw new Error("expected the call to fail");
}

type Args = { campaignId: string; from?: string; to?: string; city?: Doc<"screens">["city"]; screenId?: string };
const report = (t: T, sessionId: string, a: Args) => t.query(api.reports.campaign, { sessionId, ...a });
type Report = Awaited<ReturnType<typeof report>>;

/** Expected values straight from the locked lib functions and the raw log (the oracle). */
function expectMatches(r: Report, c: Doc<"campaigns">, sel: Doc<"screens">[], log: Doc<"showLog">[], from: string, to: string) {
  const days = datesInRange(from > c.startDate ? from : c.startDate, to < c.endDate ? to : c.endDate);
  const ids = new Set<string>(sel.map((s) => s._id));
  const rows = log.filter((x) => x.campaignId === c._id && ids.has(x.screenId) && days.includes(x.date));
  const sum = (f: (s: Doc<"screens">, d: string) => number) => sel.reduce((a, s) => a + days.reduce((b, d) => b + f(s, d), 0), 0);
  expect(r.screens.map((s) => s.code)).toEqual(sel.map((s) => s.code));
  expect(r.placement.plannedShows).toBe(plannedShows(c, sel, from, to).total);
  expect(r.placement.logShows).toBe(rows.reduce((a, x) => a + x.shows, 0));
  expect(r.placement.byDay.map((d) => d.date)).toEqual(days);
  expect(r.screenAnalytics.traffic).toBe(sum((s, d) => audienceDay(s, d)?.people ?? 0));
  expect(r.screenAnalytics.looks).toBe(sum((s, d) => audienceDay(s, d)?.looks ?? 0));
  expect(r.screenAnalytics.contacts).toBe(estimateContacts(c, sel, from, to).total);
  // the per-day and the per-screen values each sum to the totals
  for (const parts of [r.placement.byDay, r.placement.byScreen]) {
    expect(parts.reduce((a, p) => a + p.planned, 0)).toBe(r.placement.plannedShows);
    expect(parts.reduce((a, p) => a + p.log, 0)).toBe(r.placement.logShows);
  }
}

describe("[f09-reports] reports.campaign", () => {
  test("[f09-reports] report shows all values", async () => {
    const { t, sessionId, data, summer, own } = await seeded();
    const r = await report(t, sessionId, { campaignId: summer._id });
    expect(r.campaign).toMatchObject({ name: "Летняя акция", advertiser: "Demo Cola", status: "active" });
    expect(r.period).toEqual({ from: summer.startDate, to: summer.endDate });
    expect(r.cities).toEqual(["astana", "karaganda"]);
    expect(r.options).toEqual({ cities: ["astana", "karaganda"], screens: r.screens });
    expect(r.screens).toHaveLength(30);
    expect(r.placement.byDay).toHaveLength(31);
    expect(r.placement.byScreen.map((s) => s.code)).toEqual(own.map((s) => s.code));
    expectMatches(r, summer, own, data.showLog, summer.startDate, summer.endDate);
  });

  test("[f09-reports] contacts match the dashboard helper", async () => {
    const { t, sessionId, summer, own } = await seeded();
    const from = addDays(TODAY, -6);
    const r = await report(t, sessionId, { campaignId: summer._id, from, to: TODAY, city: "astana" });
    const sel = own.filter((s) => s.city === "astana");
    expect(r.screenAnalytics.contacts).toBe(estimateContacts(summer, sel, from, TODAY).total);
    expect(r.screenAnalytics.contacts).toBeGreaterThan(0);
  });

  test("[f09-reports] screen without a camera adds no analytics", async () => {
    const { t, sessionId, summer, own } = await seeded();
    const noCamera = own.find((s) => !s.hasCamera)!;
    const one = await report(t, sessionId, { campaignId: summer._id, screenId: noCamera._id });
    expect(one.screenAnalytics).toEqual({ traffic: 0, looks: 0, contacts: 0, screensWithoutCamera: 1 });
    expect(one.placement.plannedShows).toBeGreaterThan(0); // the plan does not depend on a camera
    const all = await report(t, sessionId, { campaignId: summer._id });
    expect(all.screenAnalytics.screensWithoutCamera).toBe(own.filter((s) => !s.hasCamera).length);
  });

  test("[f09-reports] completion follows the formula", async () => {
    const t = setup();
    const sessionId = await session(t);
    const campaignId = await t.run(async (ctx) => {
      const screenId = await ctx.db.insert("screens", {
        code: "AST-901", name: "AST-901 Синтетический", city: "astana", address: "ул. Демонстрационная-1, 1", lat: 51.1, lng: 71.4,
        status: "online", workStartHour: 7, workEndHour: 23, hasCamera: true, hasVehicleMetric: false, imageKey: "screen-1",
      });
      const id = await ctx.db.insert("campaigns", {
        name: "Синтетическая кампания", advertiser: "Demo Synthetic", startDate: TODAY, endDate: TODAY,
        startHour: 8, endHour: 20, slotsPerCycle: 1, screenIds: [screenId], creative: { kind: "placeholder", key: "placeholder-1" },
      });
      await ctx.db.insert("showLog", { campaignId: id, screenId, date: TODAY, shows: 648 });
      return id;
    });
    const r = await report(t, sessionId, { campaignId });
    expect(r.placement.plannedShows).toBe(720);
    expect(r.placement.logShows).toBe(648);
    expect(r.placement.completion).toBe(90);
    expect(r.placement.byScreen[0].completion).toBe(90);
  });

  test("[f09-reports] zero plan shows a dash", async () => {
    const { t, sessionId, summer } = await seeded();
    const before = addDays(summer.startDate, -5);
    const r = await report(t, sessionId, { campaignId: summer._id, from: before, to: addDays(before, 2) });
    expect(r.period).toBeNull();
    expect(r.placement).toMatchObject({ plannedShows: 0, logShows: 0, completion: null, byDay: [] });
    expect(r.placement.byScreen.every((s) => s.planned === 0 && s.completion === null)).toBe(true);
    expect(r.screenAnalytics).toMatchObject({ traffic: 0, looks: 0, contacts: 0 });
  });

  test("[f09-reports] seeded campaign has a full report", async () => {
    const { t, sessionId, summer } = await seeded();
    const r = await report(t, sessionId, { campaignId: summer._id });
    const { plannedShows: planned, logShows, completion, byDay, byScreen } = r.placement;
    for (const n of [planned, logShows, r.screenAnalytics.traffic, r.screenAnalytics.looks, r.screenAnalytics.contacts]) {
      expect(n).toBeGreaterThan(0);
    }
    expect(completion).toBeGreaterThan(0);
    expect(completion).toBeLessThanOrEqual(100);
    expect(byDay.length).toBeGreaterThan(0);
    expect(byScreen.length).toBeGreaterThan(0);
  });

  test("[f09-reports] filter by period narrows the report", async () => {
    const { t, sessionId, data, summer, own } = await seeded();
    const to = addDays(summer.startDate, 2);
    const r = await report(t, sessionId, { campaignId: summer._id, from: summer.startDate, to });
    expect(r.period).toEqual({ from: summer.startDate, to });
    expect(r.placement.byDay.map((d) => d.date)).toEqual(datesInRange(summer.startDate, to));
    expectMatches(r, summer, own, data.showLog, summer.startDate, to);
    const all = await report(t, sessionId, { campaignId: summer._id });
    expect(r.placement.plannedShows).toBeLessThan(all.placement.plannedShows);
    expect(r.screenAnalytics.traffic).toBeLessThan(all.screenAnalytics.traffic);
    // a period wider than the campaign is clipped to it
    const wide = await report(t, sessionId, { campaignId: summer._id, from: addDays(summer.startDate, -3), to: addDays(summer.endDate, 3) });
    expect(wide.period).toEqual({ from: summer.startDate, to: summer.endDate });
    expect(wide.screenAnalytics).toEqual(all.screenAnalytics);
  });

  test("[f09-reports] filter by city narrows the report", async () => {
    const { t, sessionId, data, summer, own } = await seeded();
    const r = await report(t, sessionId, { campaignId: summer._id, city: "karaganda" });
    const sel = own.filter((s) => s.city === "karaganda");
    expect(r.cities).toEqual(["karaganda"]);
    expect(r.placement.byScreen.every((s) => s.city === "karaganda")).toBe(true);
    expect(r.options.cities).toEqual(["astana", "karaganda"]);
    expectMatches(r, summer, sel, data.showLog, summer.startDate, summer.endDate);
  });

  test("[f09-reports] filter by billboard narrows the report", async () => {
    const { t, sessionId, data, summer, own } = await seeded();
    const screen = own.find((s) => s.hasCamera)!;
    const r = await report(t, sessionId, { campaignId: summer._id, screenId: screen._id });
    expect(r.placement.byScreen).toHaveLength(1);
    const [row] = r.placement.byScreen;
    expect([row.planned, row.log, row.completion]).toEqual([r.placement.plannedShows, r.placement.logShows, r.placement.completion]);
    expect(r.options.screens).toHaveLength(own.length);
    expectMatches(r, summer, [screen], data.showLog, summer.startDate, summer.endDate);
  });

  test("[f09-reports] report without session is refused", async () => {
    const { t, summer } = await seeded();
    for (const sessionId of [crypto.randomUUID(), ""]) {
      expect((await errorData(report(t, sessionId, { campaignId: summer._id }))).code).toBe("UNAUTHENTICATED");
    }
    // the session check runs before the id check
    expect((await errorData(report(t, crypto.randomUUID(), { campaignId: "not-an-id" }))).code).toBe("UNAUTHENTICATED");
  });

  test("[f09-reports] report of a deleted campaign", async () => {
    const { t, sessionId, summer } = await seeded(true);
    await t.run((ctx) => ctx.db.delete(summer._id));
    for (const campaignId of [summer._id, "not-an-id"]) {
      expect(await errorData(report(t, sessionId, { campaignId }))).toEqual({ code: "NOT_FOUND", entity: "campaign" });
    }
  });

  test("[f09-reports] period end before start is refused", async () => {
    const { t, sessionId, summer } = await seeded();
    const r = report(t, sessionId, { campaignId: summer._id, from: "2026-10-20", to: "2026-10-10" });
    expect(await errorData(r)).toEqual({ code: "INVALID_INPUT", field: "to" });
    const long = report(t, sessionId, { campaignId: summer._id, from: "2025-01-01", to: "2026-01-02" });
    expect(await errorData(long)).toEqual({ code: "INVALID_INPUT", field: "to" });
  });

  test("[f09-reports] malformed date is refused", async () => {
    const { t, sessionId, summer } = await seeded();
    expect(await errorData(report(t, sessionId, { campaignId: summer._id, from: "2026-13-01" }))).toEqual({ code: "INVALID_INPUT", field: "from" });
    expect(await errorData(report(t, sessionId, { campaignId: summer._id, to: "2026-02-30" }))).toEqual({ code: "INVALID_INPUT", field: "to" });
  });

  test("[f09-reports] billboard outside the campaign is refused", async () => {
    const { t, sessionId, data, summer } = await seeded();
    const outside = data.screens.find((s) => !summer.screenIds.includes(s._id))!;
    for (const screenId of [outside._id, "not-an-id"]) {
      expect(await errorData(report(t, sessionId, { campaignId: summer._id, screenId }))).toEqual({ code: "INVALID_INPUT", field: "screenId" });
    }
  });
});
