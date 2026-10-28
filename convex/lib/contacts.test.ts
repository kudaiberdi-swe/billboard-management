// campaign-contacts (D-4) scenarios of f02-dashboard. Pure helper: synthetic screens and campaigns, no ctx.
import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { seedScreens } from "../seed";
import { audienceDay, audienceHour } from "./analytics";
import { estimateContacts } from "./contacts";
import { isOn, type CampaignRule, type ScreenRule } from "./slots";
import { datesInRange } from "./time";

const screens: ScreenRule[] = seedScreens().map((s, i) => ({ ...s, _id: `screen${i}` as Id<"screens"> }));
const camera = screens.filter((s) => s.hasCamera);
const noCamera = screens.find((s) => !s.hasCamera)!;

function campaign(over: Partial<CampaignRule>): CampaignRule {
  return {
    _id: "c1" as Id<"campaigns">,
    _creationTime: 1,
    name: "Синтетическая кампания",
    startDate: "2026-11-02",
    endDate: "2026-11-06",
    startHour: 8,
    endHour: 20,
    slotsPerCycle: 2,
    screenIds: [],
    ...over,
  };
}

describe("[f02-dashboard] campaign-contacts", () => {
  test("[f02-dashboard] contacts follow the formula", () => {
    const s = camera.find((x) => x.workStartHour <= 8)!;
    const c = campaign({ startDate: "2026-11-02", endDate: "2026-11-02", startHour: 8, endHour: 10, slotsPerCycle: 2, screenIds: [s._id] });
    const r = estimateContacts(c, [s], "2026-11-02", "2026-11-02");
    const expected = Math.round(
      ((audienceHour(s, "2026-11-02", 8)!.looks + audienceHour(s, "2026-11-02", 9)!.looks) * 2) / 12,
    );
    expect(expected).toBeGreaterThan(0);
    expect(r.total).toBe(expected);
    expect(r.byDay).toEqual([{ date: "2026-11-02", contacts: expected }]);
    // the same formula by isOn + audienceHour per hour, for every seed screen and several hour windows
    for (const [startHour, endHour] of [[0, 24], [6, 9], [18, 23], [22, 24]]) {
      const all = campaign({ startDate: "2026-11-02", endDate: "2026-11-02", startHour, endHour, slotsPerCycle: 5, screenIds: screens.map((x) => x._id) });
      const got = estimateContacts(all, screens, "2026-11-02", "2026-11-02").byScreen;
      screens.forEach((x, i) => {
        let looks = 0;
        for (let h = 0; h < 24; h += 1) if (isOn(all, x, "2026-11-02", h)) looks += audienceHour(x, "2026-11-02", h)?.looks ?? 0;
        expect(got[i].contacts).toBe(Math.round((looks * 5) / 12));
      });
    }
  });

  test("[f02-dashboard] hours off the campaign add nothing", () => {
    const s = camera.find((x) => x.workStartHour === 7 && x.workEndHour === 23)!;
    const c = campaign({ startDate: "2026-11-04", endDate: "2026-11-05", startHour: 10, endHour: 12, slotsPerCycle: 3, screenIds: [s._id] });
    const r = estimateContacts(c, [s], "2026-11-01", "2026-11-05");
    expect(r.byDay.map((d) => d.date)).toEqual(["2026-11-04", "2026-11-05"]);
    for (const d of r.byDay) {
      const looks = audienceHour(s, d.date, 10)!.looks + audienceHour(s, d.date, 11)!.looks;
      expect(d.contacts).toBe(Math.round((looks * 3) / 12));
    }
    expect(estimateContacts(c, [s], "2026-11-01", "2026-11-03")).toEqual({ total: 0, byDay: [], byScreen: [{ screenId: s._id, contacts: 0 }] });
    // hours outside the screen working hours: 05:00–07:00 is before a 07:00–23:00 screen opens
    const early = campaign({ startDate: "2026-11-04", endDate: "2026-11-04", startHour: 5, endHour: 7, screenIds: [s._id] });
    expect(estimateContacts(early, [s], "2026-11-04", "2026-11-04").total).toBe(0);
  });

  test("[f02-dashboard] contacts never exceed looks", () => {
    const days = datesInRange("2026-11-01", "2026-11-07");
    for (const slotsPerCycle of [1, 5, 12]) {
      for (const [startHour, endHour] of [[0, 24], [7, 23], [18, 23]]) {
        const c = campaign({ startDate: "2026-11-01", endDate: "2026-11-07", startHour, endHour, slotsPerCycle, screenIds: screens.map((s) => s._id) });
        for (const date of days) {
          const r = estimateContacts(c, screens, date, date);
          r.byScreen.forEach(({ screenId, contacts }) => {
            const s = screens.find((x) => x._id === screenId)!;
            expect(Number.isInteger(contacts)).toBe(true);
            expect(contacts).toBeGreaterThanOrEqual(0);
            expect(contacts).toBeLessThanOrEqual(audienceDay(s, date)?.looks ?? 0);
          });
        }
      }
    }
  });

  test("[f02-dashboard] screen without a camera adds zero", () => {
    const cam = camera[0];
    const c = campaign({ screenIds: [cam._id, noCamera._id] });
    const r = estimateContacts(c, [cam, noCamera], "2026-11-02", "2026-11-06");
    expect(r.byScreen.find((x) => x.screenId === noCamera._id)!.contacts).toBe(0);
    expect(r.total).toBe(estimateContacts(c, [cam], "2026-11-02", "2026-11-06").total);
    expect(r.total).toBeGreaterThan(0);
  });

  test("[f02-dashboard] parts sum to the total", () => {
    const three = camera.slice(0, 3);
    const c = campaign({ screenIds: three.map((s) => s._id) });
    const r = estimateContacts(c, three, "2026-11-02", "2026-11-06");
    const sum = (xs: { contacts: number }[]) => xs.reduce((a, x) => a + x.contacts, 0);
    expect(r.byDay).toHaveLength(5);
    expect(r.byScreen).toHaveLength(3);
    expect(sum(r.byDay)).toBe(r.total);
    expect(sum(r.byScreen)).toBe(r.total);
  });

  test("[f02-dashboard] same inputs give the same contacts", () => {
    const c = campaign({ screenIds: screens.slice(0, 10).map((s) => s._id) });
    expect(estimateContacts(c, screens, "2026-11-01", "2026-11-10")).toEqual(estimateContacts(c, screens, "2026-11-01", "2026-11-10"));
  });
});
