/// <reference types="vite/client" />
// dashboard scenarios of f02-dashboard (backend-observable part). Synthetic seed only.
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply;
// the record-id arg (screenId) is checked for unknown ids (NOT_FOUND) and malformed ids (refused by the validator).
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";
import { audienceDay } from "./lib/analytics";
import { estimateContacts } from "./lib/contacts";
import { occupancy, plannedShows } from "./lib/slots";
import { campaignStatus } from "./lib/status";
import { addDays, datesInRange } from "./lib/time";
import { replaceShowLog, seedClock, seedData } from "./seed";

const modules = import.meta.glob("./**/*.*s");
const TODAY = "2026-10-31";
const NOW = Date.parse(`${TODAY}T07:00:00Z`); // 12:00 UTC+5
const WEEK = { from: addDays(TODAY, -6), to: TODAY };

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

async function session(t: T, expiresAt = Date.now() + 7 * 86_400_000) {
  const sessionId = crypto.randomUUID();
  await t.run((ctx) => ctx.db.insert("demoSessions", { sessionId, expiresAt }));
  return sessionId;
}

async function seeded() {
  const t = setup();
  await t.run((ctx) => seedData(ctx, TODAY));
  return { t, sessionId: await session(t) };
}

async function errorData(call: Promise<unknown>): Promise<{ code: string; field?: string; entity?: string }> {
  try {
    await call;
  } catch (e) {
    if (e instanceof ConvexError) return e.data as { code: string };
    throw e;
  }
  throw new Error("expected the call to fail");
}

const load = (t: T) =>
  t.run(async (ctx) => ({
    screens: await ctx.db.query("screens").collect(),
    campaigns: await ctx.db.query("campaigns").collect(),
    showLog: await ctx.db.query("showLog").collect(),
  }));

/** Expected values straight from the locked lib functions and the raw tables (the oracle). */
function expected(
  data: { screens: Doc<"screens">[]; campaigns: Doc<"campaigns">[]; showLog: Doc<"showLog">[] },
  sel: Doc<"screens">[],
  from: string,
  to: string,
) {
  const ids = new Set<string>(sel.map((s) => s._id));
  const onSel = data.campaigns.filter((c) => c.startDate <= to && c.endDate >= from && c.screenIds.some((id) => ids.has(id)));
  const days = datesInRange(from, to);
  return {
    total: sel.length,
    offline: sel.filter((s) => s.status === "offline").length,
    active: onSel.filter((c) => campaignStatus(c, TODAY) === "active").map((c) => c.name).sort(),
    occupancy: occupancy(sel, data.campaigns, from, to),
    plannedShows: onSel.reduce((a, c) => a + plannedShows(c, sel, from, to).total, 0),
    logShows: data.showLog.filter((r) => ids.has(r.screenId) && r.date >= from && r.date <= to).reduce((a, r) => a + r.shows, 0),
    contacts: onSel.reduce((a, c) => a + estimateContacts(c, sel, from, to).total, 0),
    looks: sel.reduce((a, s) => a + days.reduce((b, d) => b + (audienceDay(s, d)?.looks ?? 0), 0), 0),
  };
}

function expectMatches(r: Awaited<ReturnType<typeof summaryOf>>, e: ReturnType<typeof expected>) {
  expect(r.screens).toEqual({ total: e.total, online: e.total - e.offline, offline: e.offline });
  expect(r.activeList.map((c) => c.name).sort()).toEqual(e.active);
  expect(r.activeCampaigns).toBe(e.active.length);
  expect(r.occupancy).toEqual({ percent: e.occupancy.percent, occupied: e.occupancy.occupied, total: e.occupancy.total });
  expect(r.occupancyByDay).toEqual(e.occupancy.byDay.map(({ date, percent }) => ({ date, percent })));
  expect(r.plannedShows).toBe(e.plannedShows);
  expect(r.logShows).toBe(e.logShows);
  expect(r.contacts).toBe(e.contacts);
  expect(r.looks).toBe(e.looks);
  expect(r.screensByCity.reduce((a, c) => a + c.count, 0)).toBe(e.total);
}

const summaryOf = (t: T, sessionId: string, a: { from: string; to: string; city?: Doc<"screens">["city"]; screenId?: Id<"screens"> }) =>
  t.query(api.dashboard.summary, { sessionId, ...a });

describe("[f02-dashboard] dashboard.summary", () => {
  test("[f02-dashboard] cards show the network values", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const r = await summaryOf(t, sessionId, WEEK);
    expect(r.screens.total).toBe(100);
    expect(r.screens.online + r.screens.offline).toBe(100);
    expect(r.screens.offline).toBe(data.screens.filter((s) => s.status === "offline").length);
    const activeToday = data.campaigns.filter((c) => campaignStatus(c, TODAY) === "active" && c.startDate <= WEEK.to && c.endDate >= WEEK.from);
    expect(r.activeCampaigns).toBe(activeToday.length);
    expect(r.activeList.map((c) => c.name)).toEqual(expect.arrayContaining(["Летняя акция", "Открытие магазина"]));
    for (const n of [r.occupancy.percent, r.plannedShows, r.logShows, r.contacts, r.looks]) {
      expect(Number.isFinite(n)).toBe(true);
    }
    expect(r.plannedShows).toBeGreaterThan(0);
    expect(r.logShows).toBeGreaterThan(0);
    expect(r.contacts).toBeGreaterThan(0);
    expect(r.looks).toBeGreaterThan(0);
    expectMatches(r, expected(data, data.screens, WEEK.from, WEEK.to));
  });

  test("[f02-dashboard] screen looks card sums looks", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const sel = data.screens.filter((s) => s.city === "karaganda");
    const r = await summaryOf(t, sessionId, { ...WEEK, city: "karaganda" });
    const days = datesInRange(WEEK.from, WEEK.to);
    const cameraLooks = sel.filter((s) => s.hasCamera).reduce((a, s) => a + days.reduce((b, d) => b + audienceDay(s, d)!.looks, 0), 0);
    expect(r.looks).toBe(cameraLooks);
    const noCamera = sel.find((s) => !s.hasCamera)!;
    expect((await summaryOf(t, sessionId, { ...WEEK, screenId: noCamera._id })).looks).toBe(0);
  });

  test("[f02-dashboard] no session is refused", async () => {
    const { t } = await seeded();
    const expired = await session(t, Date.now() + 1000);
    vi.setSystemTime(NOW + 2000);
    for (const sessionId of [crypto.randomUUID(), "", expired]) {
      expect((await errorData(summaryOf(t, sessionId, WEEK))).code).toBe("UNAUTHENTICATED");
    }
  });

  test("[f02-dashboard] planned and log shows are separate cards", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const summer = data.campaigns.find((c) => c.name === "Летняя акция")!;
    expect(data.showLog.some((r) => r.campaignId === summer._id && r.date >= WEEK.from && r.date <= WEEK.to)).toBe(true);
    const r = await summaryOf(t, sessionId, WEEK);
    const e = expected(data, data.screens, WEEK.from, WEEK.to);
    expect(r.plannedShows).toBe(e.plannedShows);
    expect(r.logShows).toBe(e.logShows);
    expect(r.logShows).toBeGreaterThan(0);
    expect(r.logShows).toBeLessThanOrEqual(r.plannedShows);
  });

  test("[f02-dashboard] log shows update after simulation", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const before = await summaryOf(t, sessionId, WEEK);
    const health = data.campaigns.find((c) => c.name === "Неделя здоровья")!; // seeded without a log
    const written = await t.run((ctx) => replaceShowLog(ctx, health, data.screens, seedClock(TODAY)));
    expect(written).toBeGreaterThan(0);
    const after = await summaryOf(t, sessionId, WEEK);
    const added = (await load(t)).showLog.filter((r) => r.campaignId === health._id).reduce((a, r) => a + r.shows, 0);
    expect(added).toBeGreaterThan(0);
    expect(after.logShows).toBe(before.logShows + added);
  });

  test("[f02-dashboard] occupancy percent follows D-3", async () => {
    const t = setup();
    const sessionId = await session(t);
    const screenId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("screens", {
        code: "AST-901", name: "AST-901 Синтетический", city: "astana", address: "ул. Демонстрационная-1, 1", lat: 51.1, lng: 71.4,
        status: "online", workStartHour: 7, workEndHour: 23, hasCamera: true, hasVehicleMetric: false, imageKey: "screen-1.jpg",
      });
      await ctx.db.insert("campaigns", {
        name: "Синтетическая кампания", advertiser: "Demo Synthetic", startDate: TODAY, endDate: TODAY,
        startHour: 8, endHour: 20, slotsPerCycle: 3, screenIds: [id], creative: { kind: "placeholder", key: "placeholder-1" },
      });
      return id;
    });
    const r = await summaryOf(t, sessionId, { from: TODAY, to: TODAY, screenId });
    expect(r.occupancy).toEqual({ percent: 18.8, occupied: 36, total: 192 });
    expect(r.occupancyByDay).toEqual([{ date: TODAY, percent: 18.8 }]);
  });

  test("[f02-dashboard] empty selection shows zero", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const atyrau = data.screens.find((s) => s.city === "atyrau")!;
    const r = await summaryOf(t, sessionId, { ...WEEK, city: "astana", screenId: atyrau._id });
    expect(r.screens).toEqual({ total: 0, online: 0, offline: 0 });
    expect([r.activeCampaigns, r.plannedShows, r.logShows, r.contacts, r.looks, r.occupancy.percent]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(r.activeList).toEqual([]);
    expect(r.screensByCity.every((c) => c.count === 0)).toBe(true);
  });

  test("[f02-dashboard] contacts follow D-4", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const sel = data.screens.filter((s) => s.city === "astana");
    const r = await summaryOf(t, sessionId, { ...WEEK, city: "astana" });
    const perCampaign = data.campaigns.map((c) => estimateContacts(c, sel, WEEK.from, WEEK.to).total);
    expect(r.contacts).toBe(perCampaign.reduce((a, n) => a + n, 0));
    expect(r.contacts).toBeGreaterThan(0);
  });

  test("[f02-dashboard] occupancy chart per day", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const r = await summaryOf(t, sessionId, WEEK);
    expect(r.occupancyByDay.map((d) => d.date)).toEqual(datesInRange(WEEK.from, WEEK.to));
    for (const d of r.occupancyByDay) expect(d.percent).toBe(occupancy(data.screens, data.campaigns, d.date, d.date).percent);
  });

  test("[f02-dashboard] screens per city block", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const r = await summaryOf(t, sessionId, WEEK);
    expect(r.screensByCity.map((c) => c.city)).toEqual(["astana", "karaganda", "atyrau", "east_kz"]);
    for (const c of r.screensByCity) expect(c.count).toBe(data.screens.filter((s) => s.city === c.city).length);
    expect(r.screensByCity.reduce((a, c) => a + c.count, 0)).toBe(100);
  });

  test("[f02-dashboard] active campaigns list", async () => {
    const { t, sessionId } = await seeded();
    const r = await summaryOf(t, sessionId, WEEK);
    const pairs = r.activeList.map((c) => [c.name, c.advertiser]);
    expect(pairs).toContainEqual(["Летняя акция", "Demo Cola"]);
    expect(pairs).toContainEqual(["Открытие магазина", "Demo Market"]);
    expect(r.activeList.map((c) => c.name)).not.toContain("Презентация автомобиля");
    const ends = r.activeList.map((c) => c.endDate);
    expect(ends).toEqual([...ends].sort());
  });

  test("[f02-dashboard] city filter changes all values", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const r = await summaryOf(t, sessionId, { ...WEEK, city: "astana" });
    const sel = data.screens.filter((s) => s.city === "astana");
    expectMatches(r, expected(data, sel, WEEK.from, WEEK.to));
    expect(r.screensByCity.filter((c) => c.count > 0)).toEqual([{ city: "astana", count: sel.length }]);
    expect(r.plannedShows).toBeLessThan((await summaryOf(t, sessionId, WEEK)).plannedShows);
  });

  test("[f02-dashboard] billboard filter changes all values", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const screen = data.screens.find((s) => s.code === "AST-012")!; // camera screen in «Летняя акция» and «Открытие магазина»
    const r = await summaryOf(t, sessionId, { ...WEEK, screenId: screen._id });
    expect(r.screens.total).toBe(1);
    expectMatches(r, expected(data, [screen], WEEK.from, WEEK.to));
    expect(r.activeList.map((c) => c.name)).toEqual(expect.arrayContaining(["Летняя акция", "Открытие магазина"]));
  });

  test("[f02-dashboard] period filter changes all values", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const week = await summaryOf(t, sessionId, WEEK);
    const day = await summaryOf(t, sessionId, { from: TODAY, to: TODAY });
    expectMatches(day, expected(data, data.screens, TODAY, TODAY));
    expect(day.occupancyByDay).toHaveLength(1);
    expect(day.plannedShows).toBeLessThan(week.plannedShows);
    expect(day.contacts).toBeLessThan(week.contacts);
    expect(day.looks).toBeLessThan(week.looks);
    // a campaign that ended inside the week is not counted for a later day only
    const ended = await summaryOf(t, sessionId, { from: addDays(TODAY, 3), to: addDays(TODAY, 3) });
    expect(ended.activeList.map((c) => c.name)).not.toContain("Осенняя распродажа");
  });

  test("[f02-dashboard] invalid period is refused", async () => {
    const { t, sessionId } = await seeded();
    const cases: [{ from: string; to: string }, string][] = [
      [{ from: TODAY, to: addDays(TODAY, -1) }, "to"],
      [{ from: "2026-10-1", to: TODAY }, "from"],
      [{ from: TODAY, to: "2026-02-30" }, "to"],
      [{ from: addDays(TODAY, -366), to: TODAY }, "period"],
    ];
    for (const [period, field] of cases) {
      expect(await errorData(summaryOf(t, sessionId, period))).toEqual({ code: "INVALID_INPUT", field });
    }
    // 366 days is the limit itself and passes
    expect((await summaryOf(t, sessionId, { from: addDays(TODAY, -365), to: TODAY })).occupancyByDay).toHaveLength(366);
  });

  test("[f02-dashboard] unknown billboard is refused", async () => {
    const { t, sessionId } = await seeded();
    const screenId = await t.run(async (ctx) => {
      const id = (await ctx.db.query("screens").first())!._id;
      await ctx.db.delete(id);
      return id;
    });
    expect(await errorData(summaryOf(t, sessionId, { ...WEEK, screenId }))).toEqual({ code: "NOT_FOUND", entity: "screen" });
    // a malformed id never reaches the handler: the v.id("screens") validator refuses it
    await expect(summaryOf(t, sessionId, { ...WEEK, screenId: "not-an-id" as Id<"screens"> })).rejects.toThrow();
  });

  test("[f02-dashboard] 366-day period over 100 screens stays fast", async () => {
    const { t, sessionId } = await seeded();
    const started = performance.now(); // only Date is faked
    await summaryOf(t, sessionId, { from: addDays(TODAY, -300), to: addDays(TODAY, 65) });
    const ms = performance.now() - started;
    console.info(`[f02-dashboard] summary 366 days × 100 screens: ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(500);
  });
});

describe("[f02-dashboard] dashboard.notifications", () => {
  test("[f02-dashboard] offline screen notification", async () => {
    const { t, sessionId } = await seeded();
    const data = await load(t);
    const list = await t.query(api.dashboard.notifications, { sessionId });
    const offline = data.screens.filter((s) => s.status === "offline");
    expect(offline.length).toBeGreaterThan(0);
    for (const s of offline) expect(list).toContainEqual({ kind: "screen_offline", refId: s._id, name: s.name });
    expect(list.filter((n) => n.kind === "screen_offline")).toHaveLength(offline.length);
  });

  test("[f02-dashboard] ending campaign notification", async () => {
    const { t, sessionId } = await seeded();
    const list = await t.query(api.dashboard.notifications, { sessionId });
    // «Осенняя распродажа» ends today + 2 days in the seed
    expect(list.filter((n) => n.kind === "campaign_ending").map((n) => n.name)).toContain("Осенняя распродажа");
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        name: "Заканчивается через 3 дня", advertiser: "Demo Synthetic", startDate: addDays(TODAY, -5), endDate: addDays(TODAY, 3),
        startHour: 8, endHour: 9, slotsPerCycle: 1, screenIds: [], creative: { kind: "placeholder", key: "placeholder-1" },
      }),
    );
    const names = (await t.query(api.dashboard.notifications, { sessionId })).filter((n) => n.kind === "campaign_ending").map((n) => n.name);
    expect(names).toEqual(["Осенняя распродажа", "Заканчивается через 3 дня"]);
    // network-wide: the list starts with every offline screen, then the ending campaigns
    const kinds = (await t.query(api.dashboard.notifications, { sessionId })).map((n) => n.kind);
    expect(kinds.indexOf("campaign_ending")).toBeGreaterThan(kinds.lastIndexOf("screen_offline"));
  });

  test("[f02-dashboard] campaign ending later has no notification", async () => {
    const { t, sessionId } = await seeded();
    await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        name: "Заканчивается через 4 дня", advertiser: "Demo Synthetic", startDate: addDays(TODAY, -5), endDate: addDays(TODAY, 4),
        startHour: 8, endHour: 9, slotsPerCycle: 1, screenIds: [], creative: { kind: "placeholder", key: "placeholder-1" },
      }),
    );
    const names = (await t.query(api.dashboard.notifications, { sessionId })).map((n) => n.name);
    expect(names).not.toContain("Заканчивается через 4 дня");
    expect(names).not.toContain("Новый тариф"); // ended 10 days ago
  });

  test("[f02-dashboard] notifications need a session", async () => {
    const { t } = await seeded();
    const expired = await session(t, Date.now() + 1000);
    vi.setSystemTime(NOW + 2000);
    for (const sessionId of [crypto.randomUUID(), "", expired]) {
      expect((await errorData(t.query(api.dashboard.notifications, { sessionId }))).code).toBe("UNAUTHENTICATED");
    }
  });
});
