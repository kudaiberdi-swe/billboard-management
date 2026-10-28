// Period, city and billboard filters (f02-dashboard design «Screens»): the URL search params are the filter state.
import { useState } from "react";
import { Group, Select } from "@mantine/core";
import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import { useSearchParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CITIES, type City } from "../../../convex/lib/config";
import { addDays, kzNow } from "../../../convex/lib/time";
import { t } from "../../../shared/strings";
import { useGuardedQuery } from "../../session";
import { DATE_FORMAT } from "../../theme";

export type DashboardFilters = { from: string; to: string; city?: City; screenId?: Id<"screens"> };

/** Filters from the URL; default period: the 7 days ending today (UTC+5). */
export function useFilters(): DashboardFilters {
  const [params] = useSearchParams();
  const today = kzNow(Date.now()).date;
  const city = CITIES.find((c) => c === params.get("city"));
  const screen = params.get("screen");
  return {
    from: params.get("from") ?? addDays(today, -6),
    to: params.get("to") ?? today,
    ...(city && { city }),
    ...(screen && { screenId: screen as Id<"screens"> }),
  };
}

export function Filters({ value }: { value: DashboardFilters }) {
  const [params, setParams] = useSearchParams();
  const options = useGuardedQuery(api.screens.options, {});
  // A half-picked range stays local until the second date is chosen.
  const [range, setRange] = useState<DatesRangeValue<string>>([value.from, value.to]);

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, v] of Object.entries(changes)) {
      if (v) next.set(key, v);
      else next.delete(key);
    }
    setParams(next);
  }

  function pickCity(city: string | null) {
    const screenCity = options?.find((s) => s._id === value.screenId)?.city;
    update({ city: city ?? undefined, screen: !city || screenCity === city ? value.screenId : undefined });
  }

  return (
    <Group align="flex-end">
      <DatePickerInput
        type="range"
        allowSingleDateInRange
        label={t("ru", "dashboard.filterPeriod")}
        valueFormat={DATE_FORMAT}
        value={range}
        onChange={(next) => {
          setRange(next);
          if (next[0] && next[1]) update({ from: next[0], to: next[1] });
        }}
      />
      <Select
        label={t("ru", "dashboard.filterCity")}
        placeholder={t("ru", "dashboard.allCities")}
        data={CITIES.map((c) => ({ value: c, label: t("ru", `cities.${c}`) }))}
        value={value.city ?? null}
        onChange={pickCity}
        clearable
      />
      <Select
        label={t("ru", "dashboard.filterBillboard")}
        placeholder={t("ru", "dashboard.allBillboards")}
        data={(options ?? [])
          .filter((s) => !value.city || s.city === value.city)
          .map((s) => ({ value: s._id, label: s.name }))}
        value={value.screenId ?? null}
        onChange={(screen) => update({ screen: screen ?? undefined })}
        searchable
        clearable
      />
    </Group>
  );
}
