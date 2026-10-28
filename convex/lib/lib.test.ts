/// <reference types="vite/client" />
// Pure shared functions (design D6): slot-model, statuses, audience-analytics, show-log scenarios.
import { ConvexError } from "convex/values";
import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { audienceDay, audienceHour, audienceProfile } from "./analytics";
import { CYCLES_PER_HOUR, SLOT_SECONDS, SLOTS_PER_CYCLE } from "./config";
import { fail } from "./errors";
import { simulateShowLog } from "./showLog";
import { findConflicts, hourSlots, isOn, occupancy, plannedShows, plannedShowsForDay, type CampaignRule, type ScreenRule } from "./slots";
import { campaignStatus, notifications } from "./status";
import { datesInRange, isDate, kzNow, requireDate } from "./time";

const sid = (s: string) => s as Id<"screens">;
const cid = (s: string) => s as Id<"campaigns">;

function screen(over: Partial<ScreenRule> = {}): ScreenRule {
  return {
    _id: sid("s1"), code: "AST-001", city: "astana", status: "online",
    workStartHour: 7, workEndHour: 23, hasCamera: true, hasVehicleMetric: true, ...over,
  };
}
let created = 0;
function campaign(over: Partial<CampaignRule> = {}): CampaignRule {
  created += 1;
  return {
    _id: cid(`c${created}`), _creationTime: created, name: `Demo ${created}`,
    startDate: "2026-11-01", endDate: "2026-11-10", startHour: 0, endHour: 24, slotsPerCycle: 1,
    screenIds: [sid("s1")], ...over,
  };
}
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ConvexError ? (e.data as { code: string }).code : String(e);
  }
  return null;
};

describe("slot-model", () => {
  test("[base-contract] cycle values", () => {
    expect(SLOTS_PER_CYCLE).toBe(12);
    expect(SLOT_SECONDS).toBe(5);
    expect(CYCLES_PER_HOUR).toBe(60);
  });

  test("[base-contract] slot time inside the cycle", () => {
    const slots = hourSlots(screen(), "2026-11-01", 10, []);
    expect(slots).toHaveLength(12);
    expect(slots[0]).toMatchObject({ index: 1, startSec: 0, endSec: 5, campaignId: null });
    expect(slots[11]).toMatchObject({ index: 12, startSec: 55, endSec: 60 });
  });

  test("[base-contract] today in UTC+5", () => {
    expect(kzNow(Date.parse("2026-10-30T20:30:00Z"))).toEqual({ date: "2026-10-31", hour: 1 });
  });

  test("[base-contract] invalid date string", () => {
    for (const bad of ["2026-13-01", "31.10.2026"]) {
      expect(isDate(bad)).toBe(false);
      expect(codeOf(() => requireDate(bad, "startDate"))).toBe("INVALID_INPUT");
    }
    expect(requireDate("2026-10-31", "startDate")).toBe("2026-10-31");
  });

  test("[base-contract] hour outside the show hours", () => {
    const c = campaign({ startHour: 8, endHour: 20 });
    expect(isOn(c, screen(), "2026-11-02", 19)).toBe(true);
    expect(isOn(c, screen(), "2026-11-02", 20)).toBe(false);
  });

  test("[base-contract] hour outside the working hours", () => {
    const c = campaign({ startHour: 0, endHour: 24 });
    expect(isOn(c, screen(), "2026-11-02", 22)).toBe(true);
    expect(isOn(c, screen(), "2026-11-02", 23)).toBe(false);
  });

  test("[base-contract] date outside the period", () => {
    const c = campaign({ startDate: "2026-11-01", endDate: "2026-11-10", startHour: 8, endHour: 20 });
    expect(isOn(c, screen(), "2026-11-10", 12)).toBe(true);
    expect(isOn(c, screen(), "2026-11-11", 12)).toBe(false);
  });

  test("[base-contract] two campaigns share an hour", () => {
    const b = campaign({ slotsPerCycle: 3, _creationTime: 200 });
    const a = campaign({ slotsPerCycle: 2, _creationTime: 100 });
    const owners = hourSlots(screen(), "2026-11-02", 12, [b, a]).map((s) => s.campaignId);
    expect(owners).toEqual([a._id, a._id, b._id, b._id, b._id, ...Array(7).fill(null)]);
  });

  test("[base-contract] partly overlapping campaigns", () => {
    const a = campaign({ startHour: 8, endHour: 12 });
    const b = campaign({ startHour: 10, endHour: 14 });
    const names = (h: number) => [...new Set(hourSlots(screen(), "2026-11-02", h, [a, b]).map((s) => s.campaignName).filter(Boolean))];
    expect(names(9)).toEqual([a.name]);
    expect(names(11)).toEqual([a.name, b.name]);
    expect(names(13)).toEqual([b.name]);
  });

  test("[base-contract] planned shows example from the SoW", () => {
    const screens = [screen({ _id: sid("s1") }), screen({ _id: sid("s2") }), screen({ _id: sid("s3") })];
    const c = campaign({ slotsPerCycle: 1, startHour: 8, endHour: 20, screenIds: screens.map((s) => s._id) });
    for (const s of screens) expect(plannedShowsForDay(c, s, "2026-11-02")).toBe(720);
    const day = plannedShows(c, screens, "2026-11-02", "2026-11-02");
    expect(day.total).toBe(2160);
    expect(day.byDay).toEqual([{ date: "2026-11-02", shows: 2160 }]);
    expect(day.byScreen.map((s) => s.shows)).toEqual([720, 720, 720]);
  });

  test("[base-contract] planned shows clipped to working hours", () => {
    const c = campaign({ slotsPerCycle: 2, startHour: 5, endHour: 9 });
    expect(plannedShowsForDay(c, screen(), "2026-11-02")).toBe(240);
  });

  test("[base-contract] no planned shows outside the period", () => {
    const c = campaign({ startDate: "2026-11-01", endDate: "2026-11-10" });
    expect(plannedShowsForDay(c, screen(), "2026-10-31")).toBe(0);
    expect(plannedShowsForDay(c, screen(), "2026-11-11")).toBe(0);
    expect(plannedShows(c, [screen()], "2026-10-20", "2026-10-31").total).toBe(0);
  });

  test("[base-contract] occupancy of one screen hour", () => {
    const s = screen({ workStartHour: 10, workEndHour: 11 });
    const result = occupancy([s], [campaign({ slotsPerCycle: 3 })], "2026-11-02", "2026-11-02");
    expect(result).toMatchObject({ occupied: 3, total: 12, percent: 25 });
    expect(result.byDay).toEqual([{ date: "2026-11-02", occupied: 3, total: 12, percent: 25 }]);
  });

  test("[base-contract] occupancy with no working hours", () => {
    expect(occupancy([], [campaign()], "2026-11-02", "2026-11-03")).toMatchObject({ occupied: 0, total: 0, percent: 0 });
  });

  const req = (slotsPerCycle: number) => ({
    startDate: "2026-11-02", endDate: "2026-11-02", startHour: 10, endHour: 11, slotsPerCycle, screenIds: [sid("s1")],
  });

  test("[base-contract] request fits", () => {
    expect(findConflicts(req(3), [screen()], [campaign({ slotsPerCycle: 9 })])).toEqual([]);
  });

  test("[base-contract] request does not fit", () => {
    expect(findConflicts(req(3), [screen()], [campaign({ slotsPerCycle: 10 })])).toEqual([
      { screenId: sid("s1"), date: "2026-11-02", hour: 10, free: 2, requested: 3 },
    ]);
  });

  test("[base-contract] conflicts only inside the request", () => {
    const full = [
      campaign({ slotsPerCycle: 12, startDate: "2026-11-03", endDate: "2026-11-09" }), // other dates
      campaign({ slotsPerCycle: 12, startDate: "2026-11-02", endDate: "2026-11-02", startHour: 11, endHour: 24 }), // other hours
    ];
    expect(findConflicts(req(3), [screen()], full)).toEqual([]);
  });
});

describe("statuses", () => {
  const c = { startDate: "2026-11-01", endDate: "2026-11-10" };

  test("[base-contract] campaign before the start", () => {
    expect(campaignStatus(c, "2026-10-31")).toBe("planned");
  });

  test("[base-contract] campaign on its first and last day", () => {
    expect(campaignStatus(c, "2026-11-01")).toBe("active");
    expect(campaignStatus(c, "2026-11-10")).toBe("active");
  });

  test("[base-contract] campaign after the end", () => {
    expect(campaignStatus(c, "2026-11-11")).toBe("finished");
  });

  test("[base-contract] status follows the date", () => {
    expect(["2026-10-31", "2026-11-01", "2026-11-11"].map((d) => campaignStatus(c, d))).toEqual(["planned", "active", "finished"]);
  });

  test("[base-contract] offline screen notification", () => {
    const list = notifications([{ _id: "s1", name: "AST-001", status: "offline" }, { _id: "s2", name: "AST-002", status: "online" }], [], "2026-10-31");
    expect(list).toEqual([{ kind: "screen_offline", refId: "s1", name: "AST-001" }]);
  });

  test("[base-contract] campaign ends in 3 days", () => {
    const list = notifications([], [{ _id: "c1", name: "Летняя акция", endDate: "2026-11-03" }], "2026-10-31");
    expect(list).toEqual([{ kind: "campaign_ending", refId: "c1", name: "Летняя акция" }]);
  });

  test("[base-contract] campaign ends in 4 days or ended", () => {
    const list = notifications(
      [],
      [{ _id: "c1", name: "A", endDate: "2026-11-04" }, { _id: "c2", name: "B", endDate: "2026-10-30" }],
      "2026-10-31",
    );
    expect(list).toEqual([]);
  });
});

describe("audience-analytics", () => {
  const cam = screen({ code: "AST-001" });

  test("[base-contract] same inputs give the same values", () => {
    // The generator reads only the screen code and the date, so a reset (new ids) gives the same values.
    expect(audienceHour({ ...cam, _id: sid("other-id") }, "2026-10-31", 12)).toEqual(audienceHour(cam, "2026-10-31", 12));
    expect(audienceHour(cam, "2026-10-31", 12)!.people).toBeGreaterThan(0);
  });

  test("[base-contract] looks never exceed gaze and people", () => {
    for (const date of datesInRange("2026-10-01", "2026-10-31")) {
      for (let h = 0; h < 24; h += 1) {
        const a = audienceHour(cam, date, h)!;
        expect(a.looks).toBeLessThanOrEqual(a.gazeEstimated);
        expect(a.gazeEstimated).toBeLessThanOrEqual(a.people);
        for (const n of [a.people, a.gazeEstimated, a.looks, a.vehicles!]) {
          expect(Number.isInteger(n) && n >= 0).toBe(true);
        }
      }
    }
  });

  test("[base-contract] hourly values sum to the day", () => {
    for (const s of [cam, screen({ code: "VKO-007", city: "east_kz", workStartHour: 0, workEndHour: 24 })]) {
      const hours = Array.from({ length: 24 }, (_, h) => audienceHour(s, "2026-10-31", h)!);
      const day = audienceDay(s, "2026-10-31")!;
      for (const field of ["people", "gazeEstimated", "looks", "vehicles"] as const) {
        expect(hours.reduce((sum, a) => sum + a[field]!, 0)).toBe(day[field]);
      }
    }
  });

  test("[base-contract] screen without a camera", () => {
    const s = screen({ hasCamera: false });
    expect(audienceHour(s, "2026-10-31", 12)).toBeNull();
    expect(audienceDay(s, "2026-10-31")).toBeNull();
    expect(audienceProfile(s)).toBeNull();
  });

  test("[base-contract] screen without the vehicle metric", () => {
    const a = audienceHour(screen({ hasVehicleMetric: false }), "2026-10-31", 12)!;
    expect(a.vehicles).toBeNull();
    expect(a.people).toBeGreaterThan(0);
    expect(a.looks).toBeGreaterThan(0);
  });

  test("[base-contract] hour outside working hours", () => {
    expect(audienceHour(cam, "2026-10-31", 3)).toEqual({ people: 0, gazeEstimated: 0, looks: 0, vehicles: 0 });
  });

  test("[base-contract] shares sum to 100", () => {
    for (const code of ["AST-001", "KRG-013", "ATY-020", "VKO-005"]) {
      const p = audienceProfile(screen({ code }))!;
      expect(Object.values(p.age).reduce((a, b) => a + b, 0)).toBe(100);
      expect(p.gender.male + p.gender.female).toBe(100);
      expect([...Object.values(p.age), p.gender.male].every(Number.isInteger)).toBe(true);
    }
  });
});

describe("show-log", () => {
  const now = Date.parse("2026-10-31T05:30:00Z"); // 10:30 in UTC+5
  const s1 = screen({ _id: sid("s1") });
  const s2 = screen({ _id: sid("s2"), status: "offline" });
  const c = campaign({ startDate: "2026-10-25", endDate: "2026-11-10", startHour: 8, endHour: 20, slotsPerCycle: 2, screenIds: [s1._id, s2._id] });

  test("[base-contract] log never exceeds plan", () => {
    for (const camp of [c, campaign({ startDate: "2026-09-01", endDate: "2026-10-20", slotsPerCycle: 12, screenIds: [s1._id] })]) {
      const rows = simulateShowLog(camp, [s1, s2], now);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const planned = plannedShowsForDay(camp, s1, r.date, r.date === "2026-10-31" ? 10 : undefined);
        expect(r.shows).toBeLessThanOrEqual(planned);
        expect(r.shows).toBeGreaterThanOrEqual(Math.floor(planned * 0.85));
      }
    }
  });

  test("[base-contract] no log on offline screens", () => {
    expect(simulateShowLog(c, [s1, s2], now).some((r) => r.screenId === s2._id)).toBe(false);
  });

  test("[base-contract] no log in the future", () => {
    const rows = simulateShowLog(c, [s1], now);
    expect(rows.map((r) => r.date)).toEqual(datesInRange("2026-10-25", "2026-10-31"));
    const today = rows.find((r) => r.date === "2026-10-31")!;
    expect(today.shows).toBeLessThanOrEqual(2 * 60 * 2); // hours 08 and 09 only
    expect(today.shows).toBeGreaterThanOrEqual(Math.floor(2 * 60 * 2 * 0.85));
  });

  test("[base-contract] campaign not started has no log", () => {
    expect(simulateShowLog(campaign({ startDate: "2026-11-01", screenIds: [s1._id] }), [s1], now)).toEqual([]);
  });
});

describe("errors and module rules", () => {
  test("fail throws a ConvexError with the code and details", () => {
    try {
      fail("NOT_FOUND", { entity: "campaigns" });
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<{ code: string }>).data).toEqual({ code: "NOT_FOUND", entity: "campaigns" });
      return;
    }
    throw new Error("fail did not throw");
  });

  test("convex/lib (except auth.ts) has no server imports and no ctx, so the front can import it", () => {
    const sources = import.meta.glob("./*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    const files = Object.entries(sources).filter(([path]) => !path.endsWith(".test.ts") && path !== "./auth.ts");
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const [path, src] of files) {
      expect(src, path).not.toMatch(/_generated\/server|\bctx\b/);
      for (const [, from] of src.matchAll(/from\s+"([^"]+)"/g)) {
        expect(["../_generated/dataModel", "convex/values"].includes(from) || from.startsWith("./"), `${path}: ${from}`).toBe(true);
      }
    }
  });
});
