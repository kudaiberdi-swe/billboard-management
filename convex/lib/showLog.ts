// Simulated show log rule (ADR-0007, spec show-log), shared by the seed and «Смоделировать показы» (F-10).
import type { Id } from "../_generated/dataModel";
import { hash01 } from "./hash";
import { plannedShowsForDay, type CampaignRule, type ScreenRule } from "./slots";
import { datesInRange, kzNow, type DateStr } from "./time";

/**
 * One row per «онлайн» screen and day from the start date up to today (UTC+5); today counts only
 * finished hours. shows = floor(planned × f), f in 0.85–1.0 from (campaign, screen, date), so shows ≤ plan.
 */
export function simulateShowLog(
  c: CampaignRule,
  screens: ScreenRule[],
  nowMs: number,
): { screenId: Id<"screens">; date: DateStr; shows: number }[] {
  const now = kzNow(nowMs);
  const last = c.endDate < now.date ? c.endDate : now.date;
  const rows: { screenId: Id<"screens">; date: DateStr; shows: number }[] = [];
  for (const s of screens) {
    if (s.status !== "online" || !c.screenIds.includes(s._id)) continue;
    for (const date of datesInRange(c.startDate, last)) {
      const planned = plannedShowsForDay(c, s, date, date === now.date ? now.hour : undefined);
      const f = 0.85 + 0.15 * hash01(c._id, s._id, date);
      rows.push({ screenId: s._id, date, shows: Math.floor(planned * f) });
    }
  }
  return rows;
}
