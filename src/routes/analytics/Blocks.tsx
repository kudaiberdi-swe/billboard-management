// Value cards, per-hour chart, age and gender estimate and the terms block (spec audience-screen).
// The shell's global notice marks the simulated values; no per-block label. No images of people anywhere.
import { useId, type ReactNode } from "react";
import { Paper, Progress, SimpleGrid, Stack, Table, Text, Title, VisuallyHidden } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { t, type StringsKey } from "../../../shared/strings";
import { formatHour, formatNumber, formatPercent } from "../../format";
import { AUDIENCE_SERIES_COLOR, CHART_HEIGHT, HOUR_AXIS_INTERVAL } from "../../theme";

export type Audience = NonNullable<FunctionReturnType<typeof api.analytics.screenPeriod>["audience"]>;

const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;

function Block({ title, children }: { title: string; children: (titleId: string) => ReactNode }) {
  const id = useId();
  return (
    <Paper withBorder p="md" component="section" aria-labelledby={id}>
      <Stack gap="sm">
        <Title order={2} size="h4" id={id}>
          {title}
        </Title>
        {children(id)}
      </Stack>
    </Paper>
  );
}

export function Cards({ audience }: { audience: Audience }) {
  const cards: { label: StringsKey; value: string }[] = [
    { label: "audience.people", value: formatNumber(audience.people) },
    ...(audience.vehicles === null ? [] : [{ label: "audience.vehicles" as const, value: formatNumber(audience.vehicles) }]),
    { label: "audience.looks", value: formatNumber(audience.looks) },
    { label: "audience.lookShare", value: formatPercent(audience.lookShare, true) },
  ];
  return (
    <SimpleGrid cols={cards.length}>
      {cards.map((c) => (
        <Card key={c.label} label={t("ru", c.label)} value={c.value} />
      ))}
    </SimpleGrid>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  const id = useId();
  return (
    <Paper withBorder p="md" role="group" aria-labelledby={id}>
      <Stack gap="xs" align="flex-start" h="100%" justify="space-between">
        <Text id={id} size="sm" c="dimmed">
          {label}
        </Text>
        <Text fz="h2" fw={600} style={NUMERIC}>
          {value}
        </Text>
      </Stack>
    </Paper>
  );
}

export function HourChart({ byHour }: { byHour: Audience["byHour"] }) {
  const title = t("ru", "audience.byHour");
  const people = t("ru", "audience.people");
  const looks = t("ru", "audience.looks");
  return (
    <Block title={title}>
      {() => (
        <>
          <BarChart
            h={CHART_HEIGHT}
            data={byHour.map((p) => ({ hour: formatHour(p.hour), people: p.people, looks: p.looks }))}
            dataKey="hour"
            series={[
              { name: "people", label: people, color: AUDIENCE_SERIES_COLOR.people },
              { name: "looks", label: looks, color: AUDIENCE_SERIES_COLOR.looks },
            ]}
            withLegend
            valueFormatter={formatNumber}
            xAxisProps={{ interval: HOUR_AXIS_INTERVAL }}
            barChartProps={{ accessibilityLayer: false }}
            aria-hidden
          />
          {/* Table view of the chart for screen readers. */}
          <VisuallyHidden>
            <Table>
              <Table.Caption>{title}</Table.Caption>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("ru", "audience.chartHour")}</Table.Th>
                  <Table.Th>{people}</Table.Th>
                  <Table.Th>{looks}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {byHour.map((p) => (
                  <Table.Tr key={p.hour}>
                    <Table.Td>{formatHour(p.hour)}</Table.Td>
                    <Table.Td>{formatNumber(p.people)}</Table.Td>
                    <Table.Td>{formatNumber(p.looks)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </VisuallyHidden>
        </>
      )}
    </Block>
  );
}

const AGE: Record<string, StringsKey> = {
  "18-24": "audience.age18_24",
  "25-34": "audience.age25_34",
  "35-44": "audience.age35_44",
  "45-54": "audience.age45_54",
  "55+": "audience.age55",
};

export function AgeBlock({ age }: { age: Audience["profile"]["age"] }) {
  return <Shares title={t("ru", "audience.age")} rows={age.map((a) => ({ label: t("ru", AGE[a.group]), percent: a.share }))} />;
}

export function GenderBlock({ gender }: { gender: Audience["profile"]["gender"] }) {
  return (
    <Shares
      title={t("ru", "audience.gender")}
      rows={[
        { label: t("ru", "audience.male"), percent: gender.male },
        { label: t("ru", "audience.female"), percent: gender.female },
      ]}
    />
  );
}

/** Percent shares of an estimate, with the algorithm-estimate note. */
function Shares({ title, rows }: { title: string; rows: { label: string; percent: number }[] }) {
  return (
    <Block title={title}>
      {(id) => (
        <>
          <Table aria-labelledby={id} verticalSpacing={6}>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.label}>
                  <Table.Td w="30%">{r.label}</Table.Td>
                  <Table.Td>
                    <Progress value={r.percent} aria-hidden />
                  </Table.Td>
                  <Table.Td ta="right" w="20%" style={NUMERIC}>
                    {formatPercent(r.percent)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Text size="sm" c="dimmed">
            {t("ru", "audience.estimateNote")}
          </Text>
        </>
      )}
    </Block>
  );
}

const TERMS: [StringsKey, StringsKey][] = [
  ["audience.traffic", "audience.trafficMeaning"],
  ["audience.look", "audience.lookMeaning"],
  ["audience.adShow", "audience.adShowMeaning"],
  ["audience.campaignContact", "audience.campaignContactMeaning"],
];

export function Terms() {
  const id = useId();
  return (
    <Paper withBorder p="md" component="section" aria-labelledby={id}>
      <Stack gap="sm">
        <Title order={2} size="h4" id={id}>
          {t("ru", "audience.termsTitle")}
        </Title>
        <Stack component="dl" gap="xs" m={0}>
          {TERMS.map(([term, meaning]) => (
            <div key={term}>
              <Text component="dt" fw={500}>
                {t("ru", term)}
              </Text>
              <Text component="dd" size="sm" c="dimmed" m={0}>
                {t("ru", meaning)}
              </Text>
            </div>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
