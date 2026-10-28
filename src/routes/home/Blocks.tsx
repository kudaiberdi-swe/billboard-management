// Occupancy per day, screens per city, active campaigns (spec «Chart, city block and campaign list»).
import { useId, type ReactNode } from "react";
import { Paper, Stack, Table, Text, Title, VisuallyHidden } from "@mantine/core";
import { LineChart } from "@mantine/charts";
import type { FunctionReturnType } from "convex/server";
import dayjs from "dayjs";
import type { api } from "../../../convex/_generated/api";
import { t } from "../../../shared/strings";
import { CHART_HEIGHT, DATE_FORMAT, NUMBER_LOCALE } from "../../theme";
import { formatNumber, type Summary } from "./Cards";

const formatDate = (d: string) => dayjs(d).format(DATE_FORMAT);
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

export function OccupancyChart({ days }: { days: Summary["occupancyByDay"] }) {
  const title = t("ru", "dashboard.occupancyChart");
  return (
    <Block title={title}>
      {() => (
        <>
          <LineChart
            h={CHART_HEIGHT}
            data={days.map((d) => ({ date: formatDate(d.date), percent: d.percent }))}
            dataKey="date"
            series={[{ name: "percent", label: t("ru", "dashboard.occupancy"), color: "var(--mantine-primary-color-filled)" }]}
            curveType="linear"
            unit="%"
            yAxisProps={{ domain: [0, 100] }}
            valueFormatter={(v) => v.toLocaleString(NUMBER_LOCALE)}
            aria-hidden
          />
          {/* Table view of the chart for screen readers. */}
          <VisuallyHidden>
            <Table>
              <Table.Caption>{title}</Table.Caption>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("ru", "dashboard.chartDate")}</Table.Th>
                  <Table.Th>{t("ru", "dashboard.occupancy")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {days.map((d) => (
                  <Table.Tr key={d.date}>
                    <Table.Td>{formatDate(d.date)}</Table.Td>
                    <Table.Td>{d.percent.toLocaleString(NUMBER_LOCALE)}</Table.Td>
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

export function ScreensByCity({ cities }: { cities: Summary["screensByCity"] }) {
  return (
    <Block title={t("ru", "dashboard.screensByCity")}>
      {(id) => (
        <Table aria-labelledby={id}>
          <Table.Tbody>
            {cities.map((c) => (
              <Table.Tr key={c.city}>
                <Table.Td>{t("ru", `cities.${c.city}`)}</Table.Td>
                <Table.Td ta="right" style={NUMERIC}>
                  {formatNumber(c.count)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Block>
  );
}

export function ActiveList({ campaigns }: { campaigns: Summary["activeList"] }) {
  return (
    <Block title={t("ru", "dashboard.activeList")}>
      {(id) =>
        campaigns.length === 0 ? (
          <Text c="dimmed">{t("ru", "dashboard.noActive")}</Text>
        ) : (
          <Table aria-labelledby={id}>
            <Table.Tbody>
              {campaigns.map((c) => (
                <Table.Tr key={c._id}>
                  <Table.Td fw={500}>{c.name}</Table.Td>
                  <Table.Td>{c.advertiser}</Table.Td>
                  <Table.Td ta="right" style={NUMERIC}>
                    {t("ru", "dashboard.endsOn", { date: formatDate(c.endDate) })}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )
      }
    </Block>
  );
}

export function NotificationList({ items }: { items: FunctionReturnType<typeof api.dashboard.notifications> }) {
  return (
    <Block title={t("ru", "dashboard.notificationsTitle")}>
      {() =>
        items.length === 0 ? (
          <Text c="dimmed">{t("ru", "dashboard.noNotifications")}</Text>
        ) : (
          <Stack gap="xs" component="ul" m={0} p={0} style={{ listStyle: "none" }}>
            {items.map((n) => (
              <li key={`${n.kind}-${n.refId}`}>
                <Text size="sm" fw={500}>
                  {t("ru", `notifications.${n.kind}`)}
                </Text>
                <Text size="sm" c="dimmed">
                  {n.name}
                </Text>
              </li>
            ))}
          </Stack>
        )
      }
    </Block>
  );
}
