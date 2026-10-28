import { Component, type ReactNode } from "react";
import { Anchor, Group, Image, Loader, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { t, type StringsKey } from "../../../shared/strings";
import { DemoLabel } from "../../components/DemoLabel";
import { errorCode, errorText } from "../../errors";
import { useGuardedQuery } from "../../session";
import { count, period } from "./format";

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

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
    ["campaigns.period", period(c.startDate, c.endDate)],
    ["campaigns.hours", `${pad(c.startHour)}–${pad(c.endHour)}`],
    ["campaigns.slots", c.slotsPerCycle],
    ["campaigns.status", t("ru", `status.${c.status}`)],
    ["campaigns.cities", c.cities.map((x) => t("ru", `cities.${x}`)).join(", ")],
    ["campaigns.screens", t("ru", "campaigns.screenCount", { count: c.screens.length })],
    ["campaigns.planned", count(c.plannedShows)],
    ["campaigns.log", count(c.logShows)],
  ];
  return (
    <Stack>
      <Back />
      <Group justify="space-between">
        <Title order={1}>{c.name}</Title>
        {/* actions area: f10 adds its simulate-shows button here */}
        <Group>
          <DemoLabel />
        </Group>
      </Group>
      <SimpleGrid cols={2} spacing="xl">
        <Stack gap="xs" component="dl" m={0}>
          {fields.map(([label, value]) => (
            <Group key={label} gap="xs" wrap="nowrap">
              <Text component="dt" c="dimmed" w="45%">
                {t("ru", label)}
              </Text>
              <Text component="dd" m={0}>
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
      <Title order={2} size="h3">
        {t("ru", "campaigns.screens")}
      </Title>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("ru", "campaigns.screenCode")}</Table.Th>
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
              <Table.Td>{s.code}</Table.Td>
              <Table.Td>{s.name}</Table.Td>
              <Table.Td>{t("ru", `cities.${s.city}`)}</Table.Td>
              <Table.Td>{t("ru", `status.${s.status}`)}</Table.Td>
              <Table.Td ta="right">{count(s.plannedShows)}</Table.Td>
              <Table.Td ta="right">{count(s.logShows)}</Table.Td>
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
