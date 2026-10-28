// Billboard and period pickers (f08-audience-analytics design «Screens»): the URL search params are the state.
import { useState } from "react";
import { Group, Select } from "@mantine/core";
import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import type { FunctionReturnType } from "convex/server";
import { useSearchParams } from "react-router-dom";
import type { api } from "../../../convex/_generated/api";
import { addDays, kzNow } from "../../../convex/lib/time";
import { t } from "../../../shared/strings";
import { DATE_FORMAT } from "../../theme";

export type ScreenOptions = FunctionReturnType<typeof api.screens.options>;
export type AnalyticsFilters = { screenId?: string; from: string; to: string };

/** Filters from the URL; defaults: the first billboard of the picker and the 7 days ending today (UTC+5). */
export function useFilters(options: ScreenOptions | undefined): AnalyticsFilters {
  const [params] = useSearchParams();
  const today = kzNow(Date.now()).date;
  return {
    screenId: params.get("screen") ?? options?.[0]?._id,
    from: params.get("from") ?? addDays(today, -6),
    to: params.get("to") ?? today,
  };
}

export function Filters({ value, options }: { value: AnalyticsFilters; options: ScreenOptions | undefined }) {
  const [params, setParams] = useSearchParams();
  // A half-picked range stays local until the second date is chosen.
  const [range, setRange] = useState<DatesRangeValue<string>>([value.from, value.to]);

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, v] of Object.entries(changes)) next.set(key, v);
    setParams(next);
  }

  return (
    <Group align="flex-end">
      <Select
        label={t("ru", "audience.filterBillboard")}
        data={(options ?? []).map((s) => ({ value: s._id, label: s.name }))}
        value={value.screenId ?? null}
        onChange={(screen) => screen && update({ screen })}
        allowDeselect={false}
        searchable
        miw={280}
      />
      <DatePickerInput
        type="range"
        allowSingleDateInRange
        label={t("ru", "audience.filterPeriod")}
        valueFormat={DATE_FORMAT}
        value={range}
        onChange={(next) => {
          setRange(next);
          if (next[0] && next[1]) update({ from: next[0], to: next[1] });
        }}
      />
    </Group>
  );
}
