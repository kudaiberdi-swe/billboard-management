// Display formats of the list and the card that only screens need. Shared formats live in src/format.ts.
import { KZ_OFFSET_HOURS } from "../../../convex/lib/time";
import { t } from "../../../shared/strings";
import { formatDate, formatHour } from "../../format";
import { DATE_FORMAT } from "../../theme";

/** Working hours; 0–24 reads as round-the-clock. */
export function workHours(start: number, end: number): string {
  return start === 0 && end === 24
    ? t("ru", "billboards.roundTheClock")
    : t("ru", "billboards.hoursRange", { from: formatHour(start), to: formatHour(end) });
}

/** Event time in Kazakhstan time (UTC+5), DATE_FORMAT and "HH:mm". */
export function kzDateTime(ms: number): string {
  const iso = new Date(ms + KZ_OFFSET_HOURS * 3_600_000).toISOString();
  return `${formatDate(iso.slice(0, 10), DATE_FORMAT)} ${iso.slice(11, 16)}`;
}
