// Display formats for every screen (numbers, percents, dates, hours) from the theme tokens. Values come computed
// from the server; this only formats them.
import dayjs from "dayjs";
import { t } from "../shared/strings";
import { DATE_FORMAT, NUMBER_LOCALE } from "./theme";

const numbers = new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 1 });
const oneDecimal = new Intl.NumberFormat(NUMBER_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Count or value with ru digit groups, at most 1 decimal. */
export const formatNumber = (n: number) => numbers.format(n);
/** Value, no-break space, «%». `fixed` always shows 1 decimal (occupancy, completion, shares of a total). */
export const formatPercent = (n: number, fixed = false) =>
  t("ru", "common.percent", { value: (fixed ? oneDecimal : numbers).format(n) });
/** "YYYY-MM-DD" in DATE_FORMAT (or another dayjs format such as AXIS_DATE_FORMAT). */
export const formatDate = (d: string, format = DATE_FORMAT) => dayjs(d).format(format);
export const formatPeriod = (from: string, to: string) => t("ru", "common.period", { from: formatDate(from), to: formatDate(to) });
/** Hour of the day as "08:00"; 24 reads "24:00". */
export const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;
/** Screen as one label. Seed names already start with the code ("KRG-003 ..."); never repeat it. */
export const screenTitle = (s: { code: string; name: string }) => (s.name.startsWith(s.code) ? s.name : `${s.code} ${s.name}`);
