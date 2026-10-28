// D-4 estimated contacts with a campaign (f02-dashboard design; reused by f09-reports). Pure (front-importable), no Math.random.
// Traffic in the campaign's slots × look rate = people × (slots/12) × (looks/people) = looks × slots/12 per hour.
import type { Id } from "../_generated/dataModel";
import { audienceDay } from "./analytics";
import { SLOTS_PER_CYCLE } from "./config";
import { type CampaignRule, type ScreenRule } from "./slots";
import { datesInRange, type DateStr } from "./time";

export function estimateContacts(
  c: CampaignRule,
  screens: ScreenRule[],
  from: DateStr,
  to: DateStr,
): { total: number; byDay: { date: DateStr; contacts: number }[]; byScreen: { screenId: Id<"screens">; contacts: number }[] } {
  const own = screens.filter((s) => c.screenIds.includes(s._id));
  const days = datesInRange(from > c.startDate ? from : c.startDate, to < c.endDate ? to : c.endDate);
  const byScreen = own.map((s) => ({ screenId: s._id, contacts: 0 }));
  const byDay = days.map((date) => {
    let contacts = 0;
    own.forEach((s, i) => {
      // Sum of audienceHour(s, date, h).looks over the hours with isOn(c, s, date, h): for an own screen on a clipped
      // day that is the window below; audienceDay of the screen narrowed to it is that exact sum in one call.
      // shortcut: relies on audienceDay = sum of its hours (analytics.ts); task 1.4 measured 583 ms -> 241 ms for 366 days
      // × 100 screens. contacts.test.ts checks it against isOn + audienceHour; go back to the hour loop if that changes.
      const window = { ...s, workStartHour: Math.max(c.startHour, s.workStartHour), workEndHour: Math.min(c.endHour, s.workEndHour) };
      const looks = audienceDay(window, date)?.looks ?? 0; // null without a camera: adds 0
      const n = Math.round((looks * c.slotsPerCycle) / SLOTS_PER_CYCLE); // rounded per screen-day, so parts sum exactly
      byScreen[i].contacts += n;
      contacts += n;
    });
    return { date, contacts };
  });
  return { total: byDay.reduce((sum, d) => sum + d.contacts, 0), byDay, byScreen };
}
