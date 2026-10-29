import { Component, type ReactNode } from "react";
import { Anchor, Badge, Group, Image, Loader, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { kzNow } from "../../../convex/lib/time";
import { t, type StringsKey } from "../../../shared/strings";
import { DemoLabel } from "../../components/DemoLabel";
import { SimulateShowsButton } from "../../components/SimulateShowsButton";
import { errorCode, errorText } from "../../errors";
import { LogShows } from "../../components/LogShows";
import { formatHour, formatNumber, formatPeriod, screenTitle } from "../../format";
import { useGuardedQuery } from "../../session";
import { CAMPAIGN_STATUS_COLOR, TERM_WIDTH } from "../../theme";

const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;

// Campaign card `/campaigns/:id` (f05-campaign-list, decision G-1). f10 adds its button to the header group.
export function CampaignCard() {
  const { id = "" } = useParams();
  return (
    <NotFound key={id}>
      <Card id={id} />
    </NotFound>
  );
}

function Card({ id }: { id: string }) {
  const c = useGuardedQuery(api.campaigns.get, { campaignId: id });
  if (c === undefined) return <Loader aria-label={t("ru", "common.loading")} />;
  const fields: [StringsKey, ReactNode][] = [
    ["campaigns.advertiser", c.advertiser],
    ["campaigns.period", formatPeriod(c.startDate, c.endDate)],
    ["campaigns.hours", `${formatHour(c.startHour)}–${formatHour(c.endHour)}`],
    ["campaigns.slots", c.slotsPerCycle],
    [
      "campaigns.status",
      <Badge color={CAMPAIGN_STATUS_COLOR[c.status]} variant="light" tt="none">
        {t("ru", `status.${c.status}`)}
      </Badge>,
    ],
    ["campaigns.cities", c.cities.map((x) => t("ru", `cities.${x}`)).join(", ")],
    ["campaigns.screens", formatNumber(c.screens.length)],
    ["campaigns.planned", formatNumber(c.plannedShows)],
    ["campaigns.log", <LogShows value={c.logShows} />],
  ];
  // The schedule opens on today inside the period, else on its first day, with this campaign marked.
  const today = kzNow(Date.now()).date;
  const day = today >= c.startDate && today <= c.endDate ? today : c.startDate;
  const first = c.screens[0];
  return (
    <Stack>
      <Back />
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={1}>{c.name}</Title>
        {/* actions area: f10 adds its simulate-shows button here */}
        <Group align="flex-start" justify="flex-end" wrap="nowrap">
          <SimulateShowsButton campaignId={c._id} />
          <DemoLabel />
        </Group>
      </Group>
      <SimpleGrid cols={2} spacing="xl">
        <Stack gap="xs" component="dl" m={0}>
          {fields.map(([label, value]) => (
            <Group key={label} gap="xs" wrap="nowrap" align="baseline">
              <Text component="dt" c="dimmed" w={TERM_WIDTH} style={{ flexShrink: 0 }}>
                {t("ru", label)}
              </Text>
              <Text component="dd" m={0} style={NUMERIC}>
                {value}
              </Text>
            </Group>
          ))}
        </Stack>
        <Stack gap="xs">
          <Text c="dimmed">{t("ru", "campaigns.creative")}</Text>
          {c.creative.kind === "placeholder" ? (
            <Image src={`/demo/creatives/${c.creative.key}.svg`} alt={t("ru", "campaigns.creative")} radius="sm" />
          ) : (
            c.creative.url && <video src={c.creative.url} controls muted loop aria-label={t("ru", "campaigns.creative")} />
          )}
        </Stack>
      </SimpleGrid>
      <Group justify="space-between" align="baseline">
        <Title order={2} size="h3">
          {t("ru", "campaigns.screens")}
        </Title>
        {first && (
          <Anchor component={Link} to={`/schedule?screen=${first._id}&date=${day}&campaign=${c._id}`} fw={500}>
            {t("ru", "campaigns.showInSchedule")}
          </Anchor>
        )}
      </Group>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("ru", "campaigns.name")}</Table.Th>
            <Table.Th>{t("ru", "campaigns.city")}</Table.Th>
            <Table.Th>{t("ru", "campaigns.screenStatus")}</Table.Th>
            <Table.Th ta="right">{t("ru", "campaigns.planned")}</Table.Th>
            <Table.Th ta="right">{t("ru", "campaigns.log")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {c.screens.map((s) => (
            <Table.Tr key={s._id}>
              <Table.Td>{screenTitle(s)}</Table.Td>
              <Table.Td>{t("ru", `cities.${s.city}`)}</Table.Td>
              <Table.Td>{t("ru", `status.${s.status}`)}</Table.Td>
              <Table.Td ta="right" style={NUMERIC}>
                {formatNumber(s.plannedShows)}
              </Table.Td>
              <Table.Td ta="right" style={NUMERIC}>
                <LogShows value={s.logShows} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function Back() {
  return (
    <Anchor component={Link} to="/campaigns">
      {t("ru", "campaigns.back")}
    </Anchor>
  );
}

/** NOT_FOUND (stale link, demo reset) shows its text and the way back; other errors go up to the shell. */
class NotFound extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {};
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (this.state.error === undefined) return this.props.children;
    if (errorCode(this.state.error) !== "NOT_FOUND") throw this.state.error;
    return (
      <Stack align="flex-start">
        <Text role="alert">{errorText(this.state.error)}</Text>
        <Back />
      </Stack>
    );
  }
}
