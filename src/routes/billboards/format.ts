// Display formats shared by the list and the card. Values come computed from the server; this only formats them.
import { KZ_OFFSET_HOURS } from "../../../convex/lib/time";
import { t } from "../../../shared/strings";

const numbers = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export const num = (n: number) => numbers.format(n);
export const percent = (n: number) => t("ru", "billboards.percent", { value: num(n) });
export const hh = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** Working hours; 0–24 reads as round-the-clock. */
export function workHours(start: number, end: number): string {
  return start === 0 && end === 24 ? t("ru", "billboards.roundTheClock") : t("ru", "billboards.hoursRange", { from: hh(start), to: hh(end) });
}

/** Event time in Kazakhstan time (UTC+5), "YYYY-MM-DD HH:mm". */
export function kzDateTime(ms: number): string {
  return new Date(ms + KZ_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
}
