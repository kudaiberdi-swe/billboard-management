// Slot model (design D6, spec slot-model): 12 slots of 5 s per 60 s cycle, filled per hour in campaign creation order.
import type { Doc, Id } from "../_generated/dataModel";
import { CYCLES_PER_HOUR, SLOT_SECONDS, SLOTS_PER_CYCLE } from "./config";
import { datesInRange, type DateStr } from "./time";

export type ScreenRule = Pick<
  Doc<"screens">,
  "_id" | "code" | "city" | "status" | "workStartHour" | "workEndHour" | "hasCamera" | "hasVehicleMetric"
>;
export type CampaignRule = Pick<
  Doc<"campaigns">,
  "_id" | "_creationTime" | "name" | "startDate" | "endDate" | "startHour" | "endHour" | "slotsPerCycle" | "screenIds"
>;
export type Slot = {
  index: number; // 1..12
  startSec: number;
  endSec: number;
  campaignId: Id<"campaigns"> | null;
  campaignName: string | null;
};
export type Conflict = { screenId: Id<"screens">; date: DateStr; hour: number; free: number; requested: number };
type Request = Pick<CampaignRule, "startDate" | "endDate" | "startHour" | "endHour" | "slotsPerCycle" | "screenIds">;

const onDate = (c: Pick<CampaignRule, "startDate" | "endDate">, date: DateStr) => c.startDate <= date && date <= c.endDate;
const onHour = (c: Pick<CampaignRule, "startHour" | "endHour">, s: ScreenRule, hour: number) =>
  c.startHour <= hour && hour < c.endHour && s.workStartHour <= hour && hour < s.workEndHour;

export function isOn(c: CampaignRule, s: ScreenRule, date: DateStr, hour: number): boolean {
  return c.screenIds.includes(s._id) && onDate(c, date) && onHour(c, s, hour);
}

const byCreation = (a: CampaignRule, b: CampaignRule) => a._creationTime - b._creationTime || a._id.localeCompare(b._id);

export function hourSlots(s: ScreenRule, date: DateStr, hour: number, campaigns: CampaignRule[]): Slot[] {
  const owners: CampaignRule[] = [];
  for (const c of campaigns.filter((c) => isOn(c, s, date, hour)).sort(byCreation)) {
    for (let i = 0; i < c.slotsPerCycle; i += 1) owners.push(c);
  }
  return Array.from({ length: SLOTS_PER_CYCLE }, (_, i) => ({
    index: i + 1,
    startSec: i * SLOT_SECONDS,
    endSec: (i + 1) * SLOT_SECONDS,
    campaignId: owners[i]?._id ?? null,
    campaignName: owners[i]?.name ?? null,
  }));
}

export function usedSlots(s: ScreenRule, date: DateStr, hour: number, campaigns: CampaignRule[]): number {
  let used = 0;
  for (const c of campaigns) if (isOn(c, s, date, hour)) used += c.slotsPerCycle;
  return used;
}

/** Planned shows of one campaign on one screen and day; `untilHour` (exclusive) cuts today to its finished hours. */
export function plannedShowsForDay(c: CampaignRule, s: ScreenRule, date: DateStr, untilHour?: number): number {
  return c.screenIds.includes(s._id) ? showsOn(c, s, date, untilHour) : 0;
}

/** plannedShowsForDay for a screen already known to be the campaign's. */
function showsOn(c: CampaignRule, s: ScreenRule, date: DateStr, untilHour?: number): number {
  if (!onDate(c, date)) return 0;
  const from = Math.max(c.startHour, s.workStartHour);
  const to = Math.min(c.endHour, s.workEndHour, untilHour ?? 24);
  return c.slotsPerCycle * CYCLES_PER_HOUR * Math.max(0, to - from);
}

export function plannedShows(c: CampaignRule, screens: ScreenRule[], from: DateStr, to: DateStr) {
  const ids = new Set(c.screenIds);
  const own = screens.filter((s) => ids.has(s._id));
  const days = datesInRange(from > c.startDate ? from : c.startDate, to < c.endDate ? to : c.endDate);
  // Every day of `days` lies inside the campaign dates, so a screen plans the same shows each day (KI-08: no days × screens loop).
  const perDay = own.map((s) => showsOn(c, s, c.startDate));
  const daily = perDay.reduce((sum, n) => sum + n, 0);
  return {
    total: daily * days.length,
    byDay: days.map((date) => ({ date, shows: daily })),
    byScreen: own.map((s, i) => ({ screenId: s._id, shows: perDay[i] * days.length })),
  };
}

/** Campaigns of each screen, so the period loops do not rescan every campaign's screen list. */
export function campaignsByScreen<C extends CampaignRule>(campaigns: C[]): Map<Id<"screens">, C[]> {
  const map = new Map<Id<"screens">, C[]>();
  for (const c of campaigns) {
    for (const id of c.screenIds) {
      const list = map.get(id);
      if (list) list.push(c);
      else map.set(id, [c]);
    }
  }
  return map;
}

/** Slots taken on a screen in one hour, from the campaigns already on that screen and date. */
function usedIn(dayCampaigns: CampaignRule[], s: ScreenRule, hour: number): number {
  let used = 0;
  for (const c of dayCampaigns) if (onHour(c, s, hour)) used += c.slotsPerCycle;
  return used;
}

const percent = (occupied: number, total: number) => (total === 0 ? 0 : Math.round((occupied / total) * 1000) / 10);

/** D-3: occupied slots / all slots in the working hours of the screens over the days × 100. Pass `index` to reuse one per query. */
export function occupancy(
  screens: ScreenRule[],
  campaigns: CampaignRule[],
  from: DateStr,
  to: DateStr,
  index = campaignsByScreen(campaigns),
) {
  let occupied = 0;
  let total = 0;
  const byDay = datesInRange(from, to).map((date) => {
    let dayOccupied = 0;
    let dayTotal = 0;
    for (const s of screens) {
      const dayCampaigns = (index.get(s._id) ?? []).filter((c) => onDate(c, date));
      for (let h = s.workStartHour; h < s.workEndHour; h += 1) {
        dayTotal += SLOTS_PER_CYCLE;
        dayOccupied += Math.min(SLOTS_PER_CYCLE, usedIn(dayCampaigns, s, h));
      }
    }
    occupied += dayOccupied;
    total += dayTotal;
    return { date, occupied: dayOccupied, total: dayTotal, percent: percent(dayOccupied, dayTotal) };
  });
  return { occupied, total, percent: percent(occupied, total), byDay };
}

/** D-9: every screen, date and hour of the request where taken + requested slots exceed 12. Empty = fits. */
export function findConflicts(req: Request, screens: ScreenRule[], campaigns: CampaignRule[]): Conflict[] {
  const index = campaignsByScreen(campaigns);
  const conflicts: Conflict[] = [];
  for (const s of screens.filter((s) => req.screenIds.includes(s._id))) {
    for (const date of datesInRange(req.startDate, req.endDate)) {
      const dayCampaigns = (index.get(s._id) ?? []).filter((c) => onDate(c, date));
      for (let hour = req.startHour; hour < req.endHour; hour += 1) {
        if (hour < s.workStartHour || hour >= s.workEndHour) continue;
        const used = usedIn(dayCampaigns, s, hour);
        if (used + req.slotsPerCycle > SLOTS_PER_CYCLE) {
          conflicts.push({ screenId: s._id, date, hour, free: Math.max(0, SLOTS_PER_CYCLE - used), requested: req.slotsPerCycle });
        }
      }
    }
  }
  return conflicts;
}
