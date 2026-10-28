import { Anchor, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { DemoLabel } from "../components/DemoLabel";
import { useGuardedQuery } from "../session";
import { count, period } from "./campaigns/format";

// Campaign list (f05-campaign-list): every campaign, newest first, status from the dates.
export function Campaigns() {
  const rows = useGuardedQuery(api.campaigns.list, {});
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>{t("ru", "routes.campaigns")}</Title>
        <DemoLabel />
      </Group>
      {rows === undefined ? (
        <Loader aria-label={t("ru", "common.loading")} />
      ) : rows.length === 0 ? (
        <Text c="dimmed">{t("ru", "campaigns.empty")}</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("ru", "campaigns.name")}</Table.Th>
              <Table.Th>{t("ru", "campaigns.advertiser")}</Table.Th>
              <Table.Th>{t("ru", "campaigns.period")}</Table.Th>
              <Table.Th>{t("ru", "campaigns.cities")}</Table.Th>
              <Table.Th ta="right">{t("ru", "campaigns.screens")}</Table.Th>
              <Table.Th>{t("ru", "campaigns.status")}</Table.Th>
              <Table.Th ta="right">{t("ru", "campaigns.planned")}</Table.Th>
              <Table.Th ta="right">{t("ru", "campaigns.log")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((c) => (
              <Table.Tr key={c._id}>
                <Table.Td>
                  <Anchor component={Link} to={`/campaigns/${c._id}`}>
                    {c.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>{c.advertiser}</Table.Td>
                <Table.Td>{period(c.startDate, c.endDate)}</Table.Td>
                <Table.Td>{c.cities.map((x) => t("ru", `cities.${x}`)).join(", ")}</Table.Td>
                <Table.Td ta="right">{count(c.screenCount)}</Table.Td>
                <Table.Td>{t("ru", `status.${c.status}`)}</Table.Td>
                <Table.Td ta="right">{count(c.plannedShows)}</Table.Td>
                <Table.Td ta="right">{count(c.logShows)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
