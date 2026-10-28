// The 8 network value cards (spec «Network value cards»). Planned and log shows are separate cards;
// every simulated value (log shows, contacts, looks) carries <DemoLabel />.
import { useId } from "react";
import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { t, type StringsKey } from "../../../shared/strings";
import { DemoLabel } from "../../components/DemoLabel";
import { NUMBER_LOCALE } from "../../theme";

export type Summary = FunctionReturnType<typeof api.dashboard.summary>;

export const formatNumber = (n: number) => n.toLocaleString(NUMBER_LOCALE);
const formatPercent = (n: number) =>
  n.toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const CARDS: { label: StringsKey; value: (s: Summary) => string; demo?: true }[] = [
  { label: "dashboard.screens", value: (s) => formatNumber(s.screens.total) },
  { label: "dashboard.online", value: (s) => formatNumber(s.screens.online) },
  { label: "dashboard.offline", value: (s) => formatNumber(s.screens.offline) },
  { label: "dashboard.activeCampaigns", value: (s) => formatNumber(s.activeCampaigns) },
  { label: "dashboard.occupancy", value: (s) => formatPercent(s.occupancy.percent) },
  { label: "dashboard.plannedShows", value: (s) => formatNumber(s.plannedShows) },
  { label: "dashboard.logShows", value: (s) => formatNumber(s.logShows), demo: true },
  { label: "dashboard.contacts", value: (s) => formatNumber(s.contacts), demo: true },
  { label: "dashboard.looks", value: (s) => formatNumber(s.looks), demo: true },
];

// Row 1: the network now (current screen status); row 2: values of the selected period.
export function Cards({ data }: { data: Summary }) {
  return (
    <Stack gap="md">
      {[CARDS.slice(0, 4), CARDS.slice(4)].map((row) => (
        <SimpleGrid key={row[0].label} cols={row.length}>
          {row.map((card) => (
            <Card key={card.label} label={t("ru", card.label)} value={card.value(data)} demo={card.demo} />
          ))}
        </SimpleGrid>
      ))}
    </Stack>
  );
}

function Card({ label, value, demo }: { label: string; value: string; demo?: true }) {
  const id = useId();
  return (
    <Paper withBorder p="md" role="group" aria-labelledby={id}>
      <Stack gap="xs" align="flex-start">
        <Text id={id} size="sm" c="dimmed">
          {label}
        </Text>
        <Text fz="h2" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Text>
        {demo && <DemoLabel />}
      </Stack>
    </Paper>
  );
}
