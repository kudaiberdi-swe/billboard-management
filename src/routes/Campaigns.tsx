import { Anchor, Badge, Button, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { DemoLabel } from "../components/DemoLabel";
import { LogShows } from "../components/LogShows";
import { formatNumber, formatPeriod } from "../format";
import { useGuardedQuery } from "../session";
import { CAMPAIGN_STATUS_COLOR, TABLE_MIN_WIDTH } from "../theme";

const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;
const FULL_LABEL = { label: { overflow: "visible", textOverflow: "clip" } } as const;

// Campaign list (f05-campaign-list): every campaign, newest first, status from the dates.
export function Campaigns() {
  const rows = useGuardedQuery(api.campaigns.list, {});
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>{t("ru", "routes.campaigns")}</Title>
        {/* fde-echo:allow-dead f06-campaign-create link button: component={Link} opens the campaign form */}
        <Button component={Link} to="/campaigns/new">{t("ru", "campaignForm.create")}</Button>
      </Group>
      {rows === undefined ? (
        <Loader aria-label={t("ru", "common.loading")} />
      ) : rows.length === 0 ? (
        <Text c="dimmed">{t("ru", "campaigns.empty")}</Text>
      ) : (
        // only the table scrolls sideways when the window is too narrow; the page never does
        <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
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
                <Table.Th ta="right">
                  <Stack gap={4} align="flex-end">
                    {t("ru", "campaigns.log")}
                    <DemoLabel />
                  </Stack>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((c) => (
                <Table.Tr key={c._id}>
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    <Anchor component={Link} to={`/campaigns/${c._id}`}>
                      {c.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>{c.advertiser}</Table.Td>
                  <Table.Td style={{ ...NUMERIC, whiteSpace: "nowrap" }}>{formatPeriod(c.startDate, c.endDate)}</Table.Td>
                  <Table.Td>{c.cities.map((x) => t("ru", `cities.${x}`)).join(", ")}</Table.Td>
                  <Table.Td ta="right" style={NUMERIC}>
                    {formatNumber(c.screenCount)}
                  </Table.Td>
                  <Table.Td>
                    {/* the status never truncates: its label keeps its full width */}
                    <Badge color={CAMPAIGN_STATUS_COLOR[c.status]} variant="light" tt="none" styles={FULL_LABEL}>
                      {t("ru", `status.${c.status}`)}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right" style={NUMERIC}>
                    {formatNumber(c.plannedShows)}
                  </Table.Td>
                  <Table.Td ta="right" style={NUMERIC}>
                    <LogShows value={c.logShows} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
