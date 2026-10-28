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

/** Strict "YYYY-MM-DD" that is a real calendar date. */
export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
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

/** Every date from `from` to `to`, both included; empty when to < from. */
export function datesInRange(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
