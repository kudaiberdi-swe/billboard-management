// The {list} of the SLOT_CONFLICT message (design «Conflict message»): per screen its date span and merged hours.
import type { Conflict } from "../../../convex/lib/slots";
import { t } from "../../../shared/strings";

type ScreenName = { _id: string; code: string; name: string };

const day = (d: string) => d.split("-").reverse().join(".");
export const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function conflictList(conflicts: Conflict[], screens: ScreenName[], count = conflicts.length): string {
  const byScreen = new Map<string, Conflict[]>();
  for (const c of conflicts) byScreen.set(c.screenId, [...(byScreen.get(c.screenId) ?? []), c]);
  const parts = [...byScreen].map(([id, list]) => {
    const s = screens.find((x) => x._id === id);
    const dates = list.map((c) => c.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    const hours = [...new Set(list.map((c) => c.hour))].sort((a, b) => a - b);
    const ranges: [number, number][] = [];
    for (const h of hours) {
      const r = ranges[ranges.length - 1];
      if (r && r[1] === h) r[1] = h + 1;
      else ranges.push([h, h + 1]);
    }
    return {
      code: s?.code ?? id,
      text: `${s ? `${s.code} ${s.name}` : id}: ${first === last ? day(first) : `${day(first)}–${day(last)}`}, ${ranges
        .map(([a, b]) => `${hh(a)}–${hh(b)}`)
        .join(", ")}`,
    };
  });
  const list = parts
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((p) => p.text)
    .join("; ");
  return count > conflicts.length ? `${list} ${t("ru", "campaignForm.andMore")}` : list;
}
