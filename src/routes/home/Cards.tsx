// The 8 network value cards (spec «Network value cards»). Planned and log shows are separate cards;
// every simulated value (log shows, contacts, looks) carries <DemoLabel />.
import { useId, type ReactNode } from "react";
import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { t, type StringsKey } from "../../../shared/strings";
import { DemoLabel } from "../../components/DemoLabel";
import { formatNumber, formatPercent } from "../../format";
import { ALERT_TEXT } from "../../theme";

export type Summary = FunctionReturnType<typeof api.dashboard.summary>;

const CARDS: { label: StringsKey; value: (s: Summary) => ReactNode; demo?: true }[] = [
  { label: "dashboard.screens", value: (s) => formatNumber(s.screens.total) },
  {
    label: "dashboard.onlineOffline",
    value: ({ screens: { online, offline } }) => (
      <>
        {formatNumber(online)} /{" "}
        <Text span inherit c={offline > 0 ? ALERT_TEXT : undefined}>
          {formatNumber(offline)}
        </Text>
      </>
    ),
  },
  { label: "dashboard.activeCampaigns", value: (s) => formatNumber(s.activeCampaigns) },
  { label: "dashboard.occupancy", value: (s) => formatPercent(s.occupancy.percent, true) },
  { label: "dashboard.plannedShows", value: (s) => formatNumber(s.plannedShows) },
  { label: "dashboard.logShows", value: (s) => formatNumber(s.logShows), demo: true },
  { label: "dashboard.contacts", value: (s) => formatNumber(s.contacts), demo: true },
  { label: "dashboard.looks", value: (s) => formatNumber(s.looks), demo: true },
];

// Row 1: the network now (current screen status) and its load; row 2: shows and audience of the selected period.
export function Cards({ data }: { data: Summary }) {
  return (
    <SimpleGrid cols={4}>
      {CARDS.map((card) => (
        <Card key={card.label} label={t("ru", card.label)} value={card.value(data)} demo={card.demo} />
      ))}
    </SimpleGrid>
  );
}

function Card({ label, value, demo }: { label: string; value: ReactNode; demo?: true }) {
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
