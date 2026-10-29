// Kazakhstan local time, fixed UTC+5 (design D6). Dates are "YYYY-MM-DD"; ranges include both ends.
import { fail } from "./errors";

export type DateStr = string;

export const KZ_OFFSET_HOURS = 5;
const DAY_MS = 86_400_000;

/** Today and the current hour in UTC+5. */
export function kzNow(nowMs: number): { date: DateStr; hour: number } {
  const local = new Date(nowMs + KZ_OFFSET_HOURS * 3_600_000);
  return { date: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
}

// Product window: no campaign, period or log date falls outside it (KI-05: year 9999 rolled over to "+010000").
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/** Strict "YYYY-MM-DD" that is a real calendar date in the product window (years 2000-2100). */
export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const year = Number(s.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** The date check for function arguments: throws INVALID_INPUT { field } unless `s` is a real date. */
export function requireDate(s: string, field: string): DateStr {
  if (!isDate(s)) fail("INVALID_INPUT", { field });
  return s;
}

const toMs = (d: DateStr) => Date.parse(`${d}T00:00:00Z`);

export function addDays(d: DateStr, n: number): DateStr {
  return new Date(toMs(d) + n * DAY_MS).toISOString().slice(0, 10);
}

/** b − a in whole days. */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toMs(b) - toMs(a)) / DAY_MS);
}

/** Every date from `from` to `to`, both included; empty when to < from. Bounded by the day count, never by a string compare. */
export function datesInRange(from: DateStr, to: DateStr): DateStr[] {
  return Array.from({ length: Math.max(0, diffDays(from, to) + 1) }, (_, i) => addDays(from, i));
}
