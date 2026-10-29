// Campaign, period, city and billboard filters (f09-reports design "Screens"): the URL search params are the filter state.
import { useState } from "react";
import { Group, Select } from "@mantine/core";
import { DatePickerInput, type DatesRangeValue } from "@mantine/dates";
import { useSearchParams } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { CITIES, type City } from "../../../convex/lib/config";
import { t } from "../../../shared/strings";
import { useGuardedQuery } from "../../session";
import { DATE_FORMAT, FILTER_WIDTH } from "../../theme";

export type ReportFilterValue = { campaignId?: string; from?: string; to?: string; city?: City; screenId?: string };
type Options = FunctionReturnType<typeof api.reports.campaign>["options"];

/** Filters from the URL; no period means the campaign period (the server clips to it). */
export function useReportFilters(): ReportFilterValue {
  const [params] = useSearchParams();
  const city = CITIES.find((c) => c === params.get("city"));
  const value: ReportFilterValue = {};
  const campaignId = params.get("campaign");
  const from = params.get("from");
  const to = params.get("to");
  const screenId = params.get("screen");
  if (campaignId) value.campaignId = campaignId;
  if (from && to) Object.assign(value, { from, to });
  if (city) value.city = city;
  if (screenId) value.screenId = screenId;
  return value;
}

/** `options` (campaign cities and screens) comes from the report; without it only the campaign and period filters show. */
export function ReportFilters({ value, options }: { value: ReportFilterValue; options?: Options }) {
  const [params, setParams] = useSearchParams();
  const campaigns = useGuardedQuery(api.campaigns.list, {});
  // A half-picked range stays local until the second date is chosen.
  const [range, setRange] = useState<DatesRangeValue<string>>([value.from ?? null, value.to ?? null]);

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, v] of Object.entries(changes)) {
      if (v) next.set(key, v);
      else next.delete(key);
    }
    setParams(next);
  }

  function pickCity(city: string | null) {
    const screenCity = options?.screens.find((s) => s._id === value.screenId)?.city;
    update({ city: city ?? undefined, screen: !city || screenCity === city ? value.screenId : undefined });
  }

  return (
    <Group align="flex-end" className="no-print">
      <Select
        label={t("ru", "reports.campaign")}
        placeholder={t("ru", "reports.selectCampaign")}
        data={(campaigns ?? []).map((c) => ({ value: c._id, label: c.name }))}
        value={value.campaignId ?? null}
        onChange={(campaign) =>
          update({ campaign: campaign ?? undefined, from: undefined, to: undefined, city: undefined, screen: undefined })
        }
        searchable
        w={FILTER_WIDTH}
      />
      {value.campaignId && (
        <DatePickerInput
          type="range"
          allowSingleDateInRange
          clearable
          label={t("ru", "reports.period")}
          placeholder={t("ru", "reports.wholePeriod")}
          valueFormat={DATE_FORMAT}
          value={range}
          onChange={(next) => {
            setRange(next);
            if (next[0] && next[1]) update({ from: next[0], to: next[1] });
            else if (!next[0] && !next[1]) update({ from: undefined, to: undefined });
          }}
          w={FILTER_WIDTH}
        />
      )}
      {options && (
        <>
          <Select
            label={t("ru", "reports.city")}
            placeholder={t("ru", "reports.allCities")}
            data={options.cities.map((c) => ({ value: c, label: t("ru", `cities.${c}`) }))}
            value={value.city ?? null}
            onChange={pickCity}
            clearable
            w={FILTER_WIDTH}
          />
          <Select
            label={t("ru", "reports.screen")}
            placeholder={t("ru", "reports.allScreens")}
            data={options.screens
              .filter((s) => !value.city || s.city === value.city)
              .map((s) => ({ value: s._id, label: s.name }))}
            value={value.screenId ?? null}
            onChange={(screen) => update({ screen: screen ?? undefined })}
            searchable
            clearable
            w={FILTER_WIDTH}
          />
        </>
      )}
    </Group>
  );
}
