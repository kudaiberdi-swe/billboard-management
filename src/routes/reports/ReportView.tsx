// The campaign report (f09-reports spec «Report content», «Two separate blocks», «Demo disclaimer»).
// The placement block holds only plan and log; the screen analytics block holds only traffic, looks and contacts.
import { useId, type ReactNode } from "react";
import { Alert, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title, VisuallyHidden } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { kzNow } from "../../../convex/lib/time";
import { CATALOGS, plural, t, type StringsKey } from "../../../shared/strings";
import { formatDate, formatNumber, formatPercent, formatPeriod } from "../../format";
import { AXIS_DATE_FORMAT, CHART_HEIGHT, DAY_AXIS_TICKS, DEMO_COLOR } from "../../theme";

export type Report = FunctionReturnType<typeof api.reports.campaign>;

const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;
const formatCompletion = (n: number | null) => (n === null ? t("ru", "reports.noPlan") : formatPercent(n, true));
const screenCount = (n: number) => plural("ru", n, CATALOGS.ru.common.screens);

/** Screen count, then the count per city in the order of the report cities (reports.screensByCity). */
function screensByCity({ cities, screens }: Pick<Report, "cities" | "screens">): string {
  if (screens.length === 0) return t("ru", "reports.noPlan");
  const list = cities.map((city) =>
    t("ru", "reports.cityCount", { city: t("ru", `cities.${city}`), count: screens.filter((s) => s.city === city).length }),
  );
  return t("ru", "reports.screensByCity", { screens: screenCount(screens.length), cities: list.join(", ") });
}

export function ReportView({ data }: { data: Report }) {
  const { campaign, period, placement, screenAnalytics } = data;
  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="nowrap" pb="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
        <Text fw={600}>{t("ru", "reports.masthead", { app: t("ru", "app.name") })}</Text>
        <Text size="sm" style={NUMERIC}>
          {t("ru", "reports.generatedOn", { date: formatDate(kzNow(Date.now()).date) })}
        </Text>
      </Group>

      <Alert color={DEMO_COLOR} variant="light" data-testid="report-disclaimer">
        <Text size="sm">{t("ru", "reports.disclaimer")}</Text>
      </Alert>

      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Title order={2}>{campaign.name}</Title>
          <Facts
            rows={[
              ["reports.advertiser", campaign.advertiser],
              ["reports.period", period ? formatPeriod(period.from, period.to) : t("ru", "reports.noPlan")],
              ["reports.cities", data.cities.map((c) => t("ru", `cities.${c}`)).join(", ") || t("ru", "reports.noPlan")],
              ["reports.screens", screensByCity(data)],
            ]}
          />
        </Stack>
        <Button className="no-print" onClick={() => window.print()} style={{ flexShrink: 0 }}>
          {t("ru", "reports.print")}
        </Button>
      </Group>

      <Block title={t("ru", "reports.placement")} flow>
        <SimpleGrid cols={3} className="report-keep">
          <Value label="reports.planned" value={formatNumber(placement.plannedShows)} />
          <Value label="reports.log" value={formatNumber(placement.logShows)} />
          <Value label="reports.completion" value={formatCompletion(placement.completion)} />
        </SimpleGrid>
        <ByDay days={placement.byDay} />
        <ByScreen rows={placement.byScreen} />
      </Block>

      <Block title={t("ru", "reports.screenAnalytics")}>
        <SimpleGrid cols={3} className="report-keep">
          <Value label="reports.traffic" value={formatNumber(screenAnalytics.traffic)} />
          <Value label="reports.looks" value={formatNumber(screenAnalytics.looks)} />
          <Value label="reports.contacts" value={formatNumber(screenAnalytics.contacts)} />
        </SimpleGrid>
        {screenAnalytics.screensWithoutCamera > 0 && (
          <Text size="sm" c="dimmed">
            {t("ru", "reports.noCamera", { screens: screenCount(screenAnalytics.screensWithoutCamera) })}
          </Text>
        )}
      </Block>
    </Stack>
  );
}

function Facts({ rows }: { rows: [StringsKey, string][] }) {
  return (
    <Stack gap={2} component="dl" m={0}>
      {rows.map(([label, value]) => (
        <Group key={label} gap="xs" wrap="nowrap" align="flex-start">
          <Text component="dt" size="sm" c="dimmed" style={{ flexShrink: 0 }}>
            {t("ru", label)}:
          </Text>
          <Text component="dd" size="sm" m={0}>
            {value}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

/** `flow`: a block that can outgrow a page (the per-screen table) breaks between its parts, never inside one. */
function Block({ title, flow, children }: { title: string; flow?: true; children: ReactNode }) {
  const id = useId();
  return (
    <Paper withBorder p="md" component="section" aria-labelledby={id} className={flow ? "report-block report-flow" : "report-block"}>
      <Stack gap="md">
        <Title order={3} size="h4" id={id}>
          {title}
        </Title>
        {children}
      </Stack>
    </Paper>
  );
}

function Value({ label, value }: { label: StringsKey; value: string }) {
  const id = useId();
  return (
    <Stack gap={4} align="flex-start" role="group" aria-labelledby={id}>
      <Text id={id} size="sm" c="dimmed">
        {t("ru", label)}
      </Text>
      <Text fz="h3" fw={600} style={NUMERIC}>
        {value}
      </Text>
    </Stack>
  );
}

function ByDay({ days }: { days: Report["placement"]["byDay"] }) {
  const title = t("ru", "reports.byDay");
  const planned = t("ru", "reports.planned");
  const log = t("ru", "reports.log");
  return (
    <Stack gap="xs" className="report-keep">
      <Text fw={500}>{title}</Text>
      <div className="report-chart">
        <BarChart
          h={CHART_HEIGHT}
          data={days.map((d) => ({ date: formatDate(d.date, AXIS_DATE_FORMAT), planned: d.planned, log: d.log }))}
          dataKey="date"
          series={[
            { name: "planned", label: planned, color: "gray.5" },
            { name: "log", label: log, color: "var(--mantine-primary-color-filled)" },
          ]}
          withLegend
          valueFormatter={formatNumber}
          // a label every n-th day at a regular step (recharts interval = ticks skipped)
          xAxisProps={{ interval: Math.max(0, Math.ceil(days.length / DAY_AXIS_TICKS) - 1) }}
          barChartProps={{ accessibilityLayer: false }}
          aria-hidden
        />
      </div>
      {/* Table view of the chart for screen readers. */}
      <VisuallyHidden>
        <Table>
          <Table.Caption>{title}</Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("ru", "reports.date")}</Table.Th>
              <Table.Th>{planned}</Table.Th>
              <Table.Th>{log}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {days.map((d) => (
              <Table.Tr key={d.date}>
                <Table.Td>{formatDate(d.date)}</Table.Td>
                <Table.Td>{formatNumber(d.planned)}</Table.Td>
                <Table.Td>{formatNumber(d.log)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </VisuallyHidden>
    </Stack>
  );
}

function ByScreen({ rows }: { rows: Report["placement"]["byScreen"] }) {
  const id = useId();
  return (
    <Stack gap="xs">
      <Text fw={500} id={id}>
        {t("ru", "reports.byScreen")}
      </Text>
      <Table aria-labelledby={id} striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("ru", "reports.screen")}</Table.Th>
            <Table.Th>{t("ru", "reports.city")}</Table.Th>
            <Table.Th ta="right">{t("ru", "reports.planned")}</Table.Th>
            <Table.Th ta="right">{t("ru", "reports.log")}</Table.Th>
            <Table.Th ta="right">{t("ru", "reports.completion")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((s) => (
            <Table.Tr key={s._id}>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{s.name}</Table.Td>
              <Table.Td>{t("ru", `cities.${s.city}`)}</Table.Td>
              <Table.Td ta="right" style={NUMERIC}>
                {formatNumber(s.planned)}
              </Table.Td>
              <Table.Td ta="right" style={NUMERIC}>
                {formatNumber(s.log)}
              </Table.Td>
              <Table.Td ta="right" style={NUMERIC}>
                {formatCompletion(s.completion)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
