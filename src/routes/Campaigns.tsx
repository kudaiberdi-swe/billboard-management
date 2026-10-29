import { Anchor, Badge, Button, Group, Loader, Stack, Table, Text, Title, Tooltip, VisuallyHidden } from "@mantine/core";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { t } from "../../shared/strings";
import { DemoLabel } from "../components/DemoLabel";
import { formatNumber, formatPeriod } from "../format";
import { useGuardedQuery } from "../session";
import { CAMPAIGN_STATUS_COLOR } from "../theme";

const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;

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
                <Table.Td miw={200} style={{ whiteSpace: "nowrap" }}>
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
                  <Badge color={CAMPAIGN_STATUS_COLOR[c.status]} variant="light" tt="none">
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
      )}
    </Stack>
  );
}

/** Shows by the log; a 0 reads as «no simulated log yet», not as a failed campaign. */
export function LogShows({ value }: { value: number }) {
  if (value > 0) return formatNumber(value);
  const note = t("ru", "campaigns.logNotSimulated");
  return (
    <Tooltip label={note}>
      <Text span inherit c="dimmed" tabIndex={0}>
        {formatNumber(0)}
        <VisuallyHidden>{note}</VisuallyHidden>
      </Text>
    </Tooltip>
  );
}
