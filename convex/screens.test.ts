/// <reference types="vite/client" />
// f03-04-billboards backend: screens.list and screens.get.
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply;
// screens.get is tested for NOT_FOUND on malformed and deleted ids instead.
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";
import { audienceDay } from "./lib/analytics";
import { CITIES } from "./lib/config";
import { hourSlots } from "./lib/slots";
import { addDays, datesInRange } from "./lib/time";
import { seedData } from "./seed";

const modules = import.meta.glob("./**/*.*s");
const TODAY = "2026-10-28";

type Ctx = ReturnType<typeof convexTest>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse(`${TODAY}T06:00:00Z`)); // 11:00 UTC+5
});
afterEach(() => vi.useRealTimers());

async function session(t: Ctx, expiresInMs = 86_400_000) {
  const sessionId = crypto.randomUUID();
  await t.run((ctx) => ctx.db.insert("demoSessions", { sessionId, expiresAt: Date.now() + expiresInMs }));
  return sessionId;
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

async function seeded() {
  const t = convexTest(schema, modules);
  await t.run((ctx) => seedData(ctx, TODAY));
  const sessionId = await session(t);
  const screens = await t.run((ctx) => ctx.db.query("screens").collect());
  const campaigns = await t.run((ctx) => ctx.db.query("campaigns").collect());
  return { t, sessionId, screens, campaigns };
}

type ScreenFields = Omit<Doc<"screens">, "_id" | "_creationTime">;
const screenFields = (over: Partial<ScreenFields> = {}): ScreenFields => ({
  code: "TST-001",
  name: "Тестовый экран",
  city: "astana",
  address: "ул. Синтетическая, 1",
  lat: 51.1,
  lng: 71.4,
  status: "online",
  workStartHour: 7,
  workEndHour: 23,
  hasCamera: true,
  hasVehicleMetric: true,
  imageKey: "screen-1",
  ...over,
});

type CampaignFields = { name: string; from: number; to: number; startHour?: number; endHour?: number; slotsPerCycle?: number };

/** Empty deployment with hand-made screens and campaigns (dates as offsets from TODAY). */
async function fixture(screens: Partial<ScreenFields>[], campaigns: (CampaignFields & { screens: number[] })[] = []) {
  const t = convexTest(schema, modules);
  const sessionId = await session(t);
  const ids = await t.run(async (ctx) => {
    const ids: Id<"screens">[] = [];
    for (const [i, s] of screens.entries()) {
      ids.push(await ctx.db.insert("screens", screenFields({ code: `TST-${String(i + 1).padStart(3, "0")}`, ...s })));
    }
    for (const c of campaigns) {
      await ctx.db.insert("campaigns", {
        name: c.name,
        advertiser: "Demo Test",
        startDate: addDays(TODAY, c.from),
        endDate: addDays(TODAY, c.to),
        startHour: c.startHour ?? 0,
        endHour: c.endHour ?? 24,
        slotsPerCycle: c.slotsPerCycle ?? 1,
        screenIds: c.screens.map((n) => ids[n]),
        creative: { kind: "placeholder", key: "placeholder-1" },
      });
    }
    return ids;
  });
  return { t, sessionId, ids };
}

describe("screens.list", () => {
  const listShowsThe100SeedScreensIn4Regions = async () => {
    const { t, sessionId } = await seeded();
    const { rows } = await t.query(api.screens.list, { sessionId });
    expect(rows).toHaveLength(100);
    for (const city of CITIES) expect(rows.some((r) => r.city === city)).toBe(true);
    const codes = rows.map((r) => r.code);
    expect(codes).toEqual([...codes].sort());
  };
  test("[f03-04-billboards] list shows the 100 seed screens in 4 regions", listShowsThe100SeedScreensIn4Regions);
  test("[c01-global-demo-notice] list shows the 100 seed screens in 4 regions", listShowsThe100SeedScreensIn4Regions);

  const seedHasOfflineScreens = async () => {
    const { t, sessionId } = await seeded();
    const { rows } = await t.query(api.screens.list, { sessionId });
    expect(rows.some((r) => r.status === "offline")).toBe(true);
    expect(rows.some((r) => r.status === "online")).toBe(true);
  };
  test("[f03-04-billboards] seed has offline screens", seedHasOfflineScreens);
  test("[c01-global-demo-notice] seed has offline screens", seedHasOfflineScreens);

  const listWithoutASessionIsRefused = async () => {
    const { t } = await seeded();
    expect((await errorData(t.query(api.screens.list, { sessionId: "no-such-session" }))).code).toBe("UNAUTHENTICATED");
    const expired = await session(t, -1);
    expect((await errorData(t.query(api.screens.list, { sessionId: expired }))).code).toBe("UNAUTHENTICATED");
  };
  test("[f03-04-billboards] list without a session is refused", listWithoutASessionIsRefused);
  test("[c01-global-demo-notice] list without a session is refused", listWithoutASessionIsRefused);

  test("[f03-04-billboards] occupancy uses the 7-day period", async () => {
    const { t, sessionId } = await fixture(
      [{}, {}, {}],
      [
        { name: "Всю неделю", from: -6, to: 10, screens: [0] },
        { name: "Первый день периода", from: -6, to: -6, screens: [1] },
        { name: "До периода", from: -7, to: -7, screens: [2] },
      ],
    );
    const { rows } = await t.query(api.screens.list, { sessionId });
    expect(rows.map((r) => [r.occupancyPercent, r.activeCampaigns])).toEqual([
      [8.3, 1], // 1 of 12 slots every working hour of the 7 days
      [1.2, 0], // 1 of 7 days
      [0, 0], // outside the window
    ]);
  });

  test("[f03-04-billboards] period is shown", async () => {
    const { t, sessionId } = await fixture([{}]);
    const { from, to } = await t.query(api.screens.list, { sessionId });
    expect({ from, to }).toEqual({ from: "2026-10-22", to: "2026-10-28" });
  });

  test("[f03-04-billboards] finished campaign is not counted as active", async () => {
    const { t, sessionId } = await fixture([{}], [{ name: "Завершена", from: -10, to: -1, screens: [0] }]);
    const { rows } = await t.query(api.screens.list, { sessionId });
    expect(rows[0].activeCampaigns).toBe(0);
  });

  test("[f03-04-billboards] screen with a camera shows the period audience", async () => {
    const { t, sessionId, screens } = await seeded();
    const { rows } = await t.query(api.screens.list, { sessionId });
    const withCamera = screens.filter((s) => s.hasCamera);
    expect(withCamera.length).toBeGreaterThan(0);
    for (const s of withCamera) {
      const expected = datesInRange("2026-10-22", TODAY).reduce((sum, d) => sum + audienceDay(s, d)!.people, 0);
      expect(rows.find((r) => r._id === s._id)!.audience).toBe(expected);
    }
  });

  test("[f03-04-billboards] screen without a camera shows нет камеры", async () => {
    const { t, sessionId } = await fixture([{ hasCamera: false, hasVehicleMetric: false }]);
    const { rows } = await t.query(api.screens.list, { sessionId });
    expect(rows[0]).toMatchObject({ hasCamera: false, audience: null });
  });

  test("[f03-04-billboards] filter by city", async () => {
    const { t, sessionId, screens } = await seeded();
    const { rows } = await t.query(api.screens.list, { sessionId, city: "karaganda" });
    expect(rows.every((r) => r.city === "karaganda")).toBe(true);
    expect(rows).toHaveLength(screens.filter((s) => s.city === "karaganda").length);
  });

  test("[f03-04-billboards] filter by status", async () => {
    const { t, sessionId, screens } = await seeded();
    const { rows } = await t.query(api.screens.list, { sessionId, screenStatus: "offline" });
    expect(rows.every((r) => r.status === "offline")).toBe(true);
    expect(rows).toHaveLength(screens.filter((s) => s.status === "offline").length);
  });

  test("[f03-04-billboards] filter by camera", async () => {
    const { t, sessionId, screens } = await seeded();
    const { rows } = await t.query(api.screens.list, { sessionId, camera: false });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => !r.hasCamera && r.audience === null)).toBe(true);
    expect(rows).toHaveLength(screens.filter((s) => !s.hasCamera).length);
  });

  test("[f03-04-billboards] filter by occupancy range", async () => {
    const { t, sessionId } = await seeded();
    const all = (await t.query(api.screens.list, { sessionId })).rows;
    const { rows } = await t.query(api.screens.list, { sessionId, occupancyMin: 10, occupancyMax: 50 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.occupancyPercent >= 10 && r.occupancyPercent <= 50)).toBe(true);
    expect(rows).toEqual(all.filter((r) => r.occupancyPercent >= 10 && r.occupancyPercent <= 50));
    // both ends inclusive
    const edge = all[0].occupancyPercent;
    const exact = await t.query(api.screens.list, { sessionId, occupancyMin: Math.floor(edge), occupancyMax: Math.ceil(edge) });
    expect(exact.rows.some((r) => r._id === all[0]._id)).toBe(true);
  });

  test("[f03-04-billboards] search by name or address", async () => {
    const { t, sessionId, screens } = await seeded();
    const target = screens.find((s) => s.code === "KRG-007")!;
    const part = target.address.slice(4); // e.g. "Демонстрационная-N, H"
    const mixed = [...part].map((ch, i) => (i % 2 ? ch.toUpperCase() : ch.toLowerCase())).join("");
    const { rows } = await t.query(api.screens.list, { sessionId, search: `  ${mixed}  ` });
    expect(rows.some((r) => r._id === target._id)).toBe(true);
    const needle = part.toLowerCase();
    expect(rows.every((r) => [r.name, r.code, r.address].some((f) => f.toLowerCase().includes(needle)))).toBe(true);
    const byCode = await t.query(api.screens.list, { sessionId, search: "krg-007" });
    expect(byCode.rows.map((r) => r.code)).toEqual(["KRG-007"]);
  });

  test("[f03-04-billboards] no screen matches", async () => {
    const { t, sessionId } = await seeded();
    const { rows } = await t.query(api.screens.list, { sessionId, search: "нет-такого-экрана" });
    expect(rows).toEqual([]);
  });

  test("[f03-04-billboards] invalid occupancy range is refused", async () => {
    const { t, sessionId } = await fixture([{}]);
    for (const bounds of [
      { occupancyMin: 60, occupancyMax: 20 },
      { occupancyMin: -1 },
      { occupancyMax: 101 },
      { occupancyMin: 10.5 },
    ]) {
      expect(await errorData(t.query(api.screens.list, { sessionId, ...bounds }))).toEqual({
        code: "INVALID_INPUT",
        field: "occupancy",
      });
    }
    await expect(t.query(api.screens.list, { sessionId, occupancyMin: 0, occupancyMax: 100 })).resolves.toBeTruthy();
  });

  test("[f03-04-billboards] too long search is refused", async () => {
    const { t, sessionId } = await fixture([{}]);
    expect(await errorData(t.query(api.screens.list, { sessionId, search: "a".repeat(101) }))).toEqual({
      code: "INVALID_INPUT",
      field: "search",
    });
    await expect(t.query(api.screens.list, { sessionId, search: "a".repeat(100) })).resolves.toBeTruthy();
  });
});

describe("screens.get", () => {
  test("[f03-04-billboards] card without a session is refused", async () => {
    const { t, ids } = await fixture([{}]);
    expect((await errorData(t.query(api.screens.get, { sessionId: "no-such-session", screenId: ids[0] }))).code).toBe(
      "UNAUTHENTICATED",
    );
    const expired = await session(t, -1);
    expect((await errorData(t.query(api.screens.get, { sessionId: expired, screenId: ids[0] }))).code).toBe("UNAUTHENTICATED");
  });

  test("[f03-04-billboards] unknown screen id", async () => {
    const { t, sessionId, ids } = await fixture([{}, {}]);
    const notFound = { code: "NOT_FOUND", entity: "screens" };
    expect(await errorData(t.query(api.screens.get, { sessionId, screenId: "malformed-id" }))).toEqual(notFound);
    await t.run((ctx) => ctx.db.delete(ids[1])); // as after «Сбросить демо»
    expect(await errorData(t.query(api.screens.get, { sessionId, screenId: ids[1] }))).toEqual(notFound);
    const campaignId = await t.run((ctx) =>
      ctx.db.insert("campaigns", {
        name: "x",
        advertiser: "Demo Test",
        startDate: TODAY,
        endDate: TODAY,
        startHour: 0,
        endHour: 1,
        slotsPerCycle: 1,
        screenIds: [ids[0]],
        creative: { kind: "placeholder", key: "placeholder-1" },
      }),
    );
    expect(await errorData(t.query(api.screens.get, { sessionId, screenId: campaignId }))).toEqual(notFound); // id of another table
  });

  test("[f03-04-billboards] card lists assigned campaigns with status", async () => {
    const { t, sessionId, ids } = await fixture(
      [{}, {}],
      [
        { name: "Запланирована", from: 3, to: 9, screens: [0] },
        { name: "Активна", from: -2, to: 5, screens: [0, 1] },
        { name: "Завершена", from: -9, to: -4, screens: [0] },
        { name: "Чужая", from: -1, to: 1, screens: [1] },
      ],
    );
    const card = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    expect(card.campaigns.map((c) => [c.name, c.status])).toEqual([
      ["Завершена", "finished"],
      ["Активна", "active"],
      ["Запланирована", "planned"],
    ]);
    expect(card.campaigns[1]).toMatchObject({ advertiser: "Demo Test", startDate: "2026-10-26", endDate: "2026-11-02", startHour: 0, endHour: 24, slotsPerCycle: 1 });
  });

  test("[f03-04-billboards] card campaigns match the schedule slots", async () => {
    const { t, sessionId, screens, campaigns } = await seeded();
    const s = screens.find((x) => x.code === "AST-012")!; // has active campaigns today
    const card = await t.query(api.screens.get, { sessionId, screenId: s._id });
    expect(card.today).toBe(TODAY);
    expect(card.hours.map((h) => h.hour)).toEqual(range(s.workStartHour, s.workEndHour));
    let busy = 0;
    for (const h of card.hours) {
      const taken = hourSlots(s, TODAY, h.hour, campaigns).filter((slot) => slot.campaignId !== null);
      expect(h.used).toBe(taken.length);
      expect(h.campaigns).toEqual([...new Map(taken.map((slot) => [slot.campaignId, slot.campaignName])).entries()].map(([_id, name]) => ({ _id, name })));
      busy += h.used;
      for (const c of h.campaigns) expect(card.campaigns.find((x) => x._id === c._id)?.status).toBe("active");
    }
    expect(busy).toBeGreaterThan(0);
  });

  test("[f03-04-billboards] free hour shows Свободно", async () => {
    const { t, sessionId, ids } = await fixture([{}], [{ name: "Утро", from: 0, to: 0, startHour: 8, endHour: 9, slotsPerCycle: 3, screens: [0] }]);
    const { hours } = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    expect(hours.find((h) => h.hour === 7)).toEqual({ hour: 7, used: 0, campaigns: [] });
    expect(hours.find((h) => h.hour === 8)).toMatchObject({ hour: 8, used: 3, campaigns: [{ name: "Утро" }] });
  });

  test("[f03-04-billboards] hours outside working hours are not listed", async () => {
    const { t, sessionId, ids } = await fixture([{ workStartHour: 7, workEndHour: 23 }], [{ name: "Сутки", from: 0, to: 0, screens: [0] }]);
    const { hours } = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    expect(hours.map((h) => h.hour)).toEqual(range(7, 23));
  });

  test("[f03-04-billboards] round-the-clock screen", async () => {
    const { t, sessionId, ids } = await fixture([{ workStartHour: 0, workEndHour: 24 }]);
    const card = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    expect(card.screen).toMatchObject({ workStartHour: 0, workEndHour: 24 });
    expect(card.hours.map((h) => h.hour)).toEqual(range(0, 24));
  });

  test("[f03-04-billboards] card shows the demo audience", async () => {
    const { t, sessionId, ids } = await fixture([{ hasCamera: true, hasVehicleMetric: true }]);
    const card = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    const s = await t.run((ctx) => ctx.db.get(ids[0]));
    const days = datesInRange(card.from, card.to).map((d) => audienceDay(s!, d)!);
    expect(days).toHaveLength(7);
    expect(card.audience).toEqual({
      people: days.reduce((a, d) => a + d.people, 0),
      looks: days.reduce((a, d) => a + d.looks, 0),
      vehicles: days.reduce((a, d) => a + d.vehicles!, 0),
    });
    expect(card.audience!.vehicles).toBeGreaterThan(0);
  });

  test("[f03-04-billboards] card of a screen without a camera", async () => {
    const { t, sessionId, ids } = await fixture([{ hasCamera: false, hasVehicleMetric: false }]);
    const card = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    expect(card.screen.hasCamera).toBe(false);
    expect(card.audience).toBeNull();
  });

  test("[f03-04-billboards] card of a screen without the vehicle metric", async () => {
    const { t, sessionId, ids } = await fixture([{ hasCamera: true, hasVehicleMetric: false }]);
    const { audience } = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    expect(audience).toMatchObject({ people: expect.any(Number), looks: expect.any(Number), vehicles: null });
    expect(audience!.people).toBeGreaterThan(0);
  });

  test("[f03-04-billboards] card shows recent screen events", async () => {
    const { t, sessionId, screens } = await seeded();
    const offline = screens.find((s) => s.status === "offline")!;
    const card = await t.query(api.screens.get, { sessionId, screenId: offline._id });
    expect(card.screen.status).toBe("offline");
    expect(card.events.length).toBeGreaterThan(0);
    expect(card.events[0]).toEqual({ at: expect.any(Number), kind: "went_offline" });

    // latest 10, newest first
    const { t: t2, sessionId: s2, ids } = await fixture([{}]);
    await t2.run(async (ctx) => {
      for (let i = 0; i < 12; i += 1) {
        await ctx.db.insert("screenEvents", { screenId: ids[0], at: 1_000 * i, kind: i % 2 ? "back_online" : "went_offline" });
      }
    });
    const { events } = await t2.query(api.screens.get, { sessionId: s2, screenId: ids[0] });
    expect(events.map((e) => e.at)).toEqual(range(2, 12).map((i) => 1_000 * i).reverse());
  });

  test("[f03-04-billboards] screen without events", async () => {
    const { t, sessionId, ids } = await fixture([{}]);
    const { events } = await t.query(api.screens.get, { sessionId, screenId: ids[0] });
    expect(events).toEqual([]);
  });
});

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from }, (_, i) => from + i);
}
