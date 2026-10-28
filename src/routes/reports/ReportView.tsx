// The campaign report (f09-reports spec «Report content», «Two separate blocks», «Demo disclaimer»).
// The placement block holds only plan and log; the screen analytics block holds only traffic, looks and contacts.
import { useId, type ReactNode } from "react";
import { Alert, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title, VisuallyHidden } from "@mantine/core";
import { BarChart } from "@mantine/charts";
import type { FunctionReturnType } from "convex/server";
import dayjs from "dayjs";
import type { api } from "../../../convex/_generated/api";
import { t, type StringsKey } from "../../../shared/strings";
import { DemoLabel } from "../../components/DemoLabel";
import { CHART_HEIGHT, DATE_FORMAT, DEMO_COLOR, NUMBER_LOCALE } from "../../theme";

export type Report = FunctionReturnType<typeof api.reports.campaign>;

const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;
const formatDate = (d: string) => dayjs(d).format(DATE_FORMAT);
const formatNumber = (n: number) => n.toLocaleString(NUMBER_LOCALE);
const formatCompletion = (n: number | null) =>
  n === null
    ? t("ru", "reports.noPlan")
    : t("ru", "reports.percent", {
        value: n.toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      });

export function ReportView({ data }: { data: Report }) {
  const { campaign, period, placement, screenAnalytics } = data;
  return (
    <Stack gap="lg">
      <Alert color={DEMO_COLOR} variant="light" data-testid="report-disclaimer">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{t("ru", "reports.disclaimer")}</Text>
          <DemoLabel />
        </Stack>
      </Alert>

      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            {t("ru", "app.name")}
          </Text>
          <Title order={2}>{campaign.name}</Title>
          <Facts
            rows={[
              ["reports.advertiser", campaign.advertiser],
              ["reports.period", period ? `${formatDate(period.from)} – ${formatDate(period.to)}` : t("ru", "reports.noPlan")],
              ["reports.cities", data.cities.map((c) => t("ru", `cities.${c}`)).join(", ") || t("ru", "reports.noPlan")],
              ["reports.screens", data.screens.map((s) => s.code).join(", ") || t("ru", "reports.noPlan")],
            ]}
          />
        </Stack>
        <Button className="no-print" onClick={() => window.print()} style={{ flexShrink: 0 }}>
          {t("ru", "reports.print")}
        </Button>
      </Group>

      <Block title={t("ru", "reports.placement")}>
        <SimpleGrid cols={3}>
          <Value label="reports.planned" value={formatNumber(placement.plannedShows)} />
          <Value label="reports.log" value={formatNumber(placement.logShows)} demo />
          <Value label="reports.completion" value={formatCompletion(placement.completion)} demo />
        </SimpleGrid>
        <ByDay days={placement.byDay} />
        <ByScreen rows={placement.byScreen} />
      </Block>

      <Block title={t("ru", "reports.screenAnalytics")}>
        <SimpleGrid cols={3}>
          <Value label="reports.traffic" value={formatNumber(screenAnalytics.traffic)} demo />
          <Value label="reports.looks" value={formatNumber(screenAnalytics.looks)} demo />
          <Value label="reports.contacts" value={formatNumber(screenAnalytics.contacts)} demo />
        </SimpleGrid>
        {screenAnalytics.screensWithoutCamera > 0 && (
          <Text size="sm" c="dimmed">
            {t("ru", "reports.noCamera", { count: formatNumber(screenAnalytics.screensWithoutCamera) })}
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

function Block({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <Paper withBorder p="md" component="section" aria-labelledby={id} className="report-block">
      <Stack gap="md">
        <Title order={3} size="h4" id={id}>
          {title}
        </Title>
        {children}
      </Stack>
    </Paper>
  );
}

function Value({ label, value, demo }: { label: StringsKey; value: string; demo?: true }) {
  const id = useId();
  return (
    <Stack gap={4} align="flex-start" role="group" aria-labelledby={id}>
      <Text id={id} size="sm" c="dimmed">
        {t("ru", label)}
      </Text>
      <Text fz="h3" fw={600} style={NUMERIC}>
        {value}
      </Text>
      {demo && <DemoLabel />}
    </Stack>
  );
}

function ByDay({ days }: { days: Report["placement"]["byDay"] }) {
  const title = t("ru", "reports.byDay");
  const planned = t("ru", "reports.planned");
  const log = t("ru", "reports.log");
  return (
    <Stack gap="xs">
      <Text fw={500}>{title}</Text>
      <div className="report-chart">
        <BarChart
          h={CHART_HEIGHT}
          data={days.map((d) => ({ date: formatDate(d.date), planned: d.planned, log: d.log }))}
          dataKey="date"
          series={[
            { name: "planned", label: planned, color: "gray.5" },
            { name: "log", label: log, color: "var(--mantine-primary-color-filled)" },
          ]}
          withLegend
          valueFormatter={formatNumber}
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
              <Table.Td>{s.name}</Table.Td>
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
