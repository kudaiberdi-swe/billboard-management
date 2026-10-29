// The conflict list of the form (design «Conflict message»): one line per screen with its date span and merged hours.
import type { Conflict } from "../../../convex/lib/slots";
import { t } from "../../../shared/strings";
import { formatDate, formatHour, screenTitle } from "../../format";

type ScreenName = { _id: string; code: string; name: string };

/** Lines ordered by screen code; campaignForm.andMore closes the list when the server sent fewer conflicts than it counted. */
export function conflictList(conflicts: Conflict[], screens: ScreenName[], count = conflicts.length): string[] {
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
      text: t("ru", "campaignForm.conflictLine", {
        screen: s ? screenTitle(s) : id,
        dates: first === last ? formatDate(first) : `${formatDate(first)}–${formatDate(last)}`,
        hours: ranges.map(([a, b]) => `${formatHour(a)}–${formatHour(b)}`).join(", "),
      }),
    };
  });
  const lines = parts.sort((a, b) => a.code.localeCompare(b.code)).map((p) => p.text);
  return count > conflicts.length ? [...lines, t("ru", "campaignForm.andMore")] : lines;
}
