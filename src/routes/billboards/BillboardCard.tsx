// Billboard card (F-4) at /billboards/:id: one screen from screens.get. Every value is computed on the server.
import { Alert, Anchor, Badge, Group, Image, List, Loader, Paper, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { t } from "../../../shared/strings";
import { DemoLabel } from "../../components/DemoLabel";
import { errorText } from "../../errors";
import { useGuardedQuery } from "../../session";
import { SLOTS_PER_CYCLE } from "../../../convex/lib/config";
import { formatHour as hh, formatNumber as num, formatPercent as percent, formatDate, formatPeriod } from "../../format";
import { CAMPAIGN_STATUS_COLOR, CARD_IMAGE_WIDTH, HOUR_COLUMN_WIDTH, SCREEN_STATUS_COLOR } from "../../theme";
import { Boundary } from "./Boundary";
import { kzDateTime, workHours } from "./format";

type Card = FunctionReturnType<typeof api.screens.get>;

function BackLink() {
  return (
    <Anchor component={Link} to="/billboards">
      {t("ru", "billboards.backToList")}
    </Anchor>
  );
}

export function BillboardCard() {
  const { id = "" } = useParams();
  return (
    <Stack gap="lg">
      <BackLink />
      <Boundary key={id} fallback={(error) => <Alert color="red">{errorText(error)}</Alert>}>
        <CardBody id={id} />
      </Boundary>
    </Stack>
  );
}

function CardBody({ id }: { id: string }) {
  const card = useGuardedQuery(api.screens.get, { screenId: id });
  if (card === undefined) {
    return (
      <Stack aria-busy="true" align="center" py="xl">
        <Loader aria-label={t("ru", "common.loading")} />
      </Stack>
    );
  }
  const { screen } = card;
  return (
    <Stack gap="xl" aria-busy="false">
      <Group gap="md" align="baseline">
        <Title order={1}>{screen.name}</Title>
        {/* seed names start with the code; show it apart only when they do not */}
        {!screen.name.startsWith(screen.code) && <Text c="dimmed">{screen.code}</Text>}
        <Badge color={SCREEN_STATUS_COLOR[screen.status]} variant="light" tt="none" size="lg">
          {t("ru", `status.${screen.status}`)}
        </Badge>
      </Group>

      <Group align="flex-start" gap="xl" wrap="nowrap">
        <Image src={`/demo/screens/${screen.imageKey}.svg`} alt={screen.name} w={CARD_IMAGE_WIDTH} radius="sm" />
        <SimpleGrid cols={3} spacing="xl" style={{ flex: 1 }}>
          <Fact label={t("ru", "billboards.location")}>
            <Text>{t("ru", `cities.${screen.city}`)}</Text>
            <Text>{screen.address}</Text>
            <Text size="sm" c="dimmed">
              {screen.lat}, {screen.lng}
            </Text>
          </Fact>
          <Fact label={t("ru", "billboards.colHours")}>
            <Text>{workHours(screen.workStartHour, screen.workEndHour)}</Text>
          </Fact>
          <Fact label={t("ru", "billboards.occupancyToday")}>
            <Text size="xl" fw={600}>
              {percent(card.occupancyTodayPercent)}
            </Text>
          </Fact>
        </SimpleGrid>
      </Group>

      <Campaigns campaigns={card.campaigns} />
      <SimpleGrid cols={2} spacing="xl">
        <Schedule hours={card.hours} />
        <Stack gap="xl">
          <Audience card={card} />
          <Events events={card.events} />
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap={4}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <Group gap="sm" mb="sm">
        <Title order={2} size="h4">
          {title}
        </Title>
        {aside}
      </Group>
      {children}
    </section>
  );
}

function Campaigns({ campaigns }: { campaigns: Card["campaigns"] }) {
  return (
    <Section title={t("ru", "billboards.campaigns")}>
      {campaigns.length === 0 ? (
        <Text c="dimmed">{t("ru", "billboards.noCampaigns")}</Text>
      ) : (
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("ru", "billboards.colCampaign")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colAdvertiser")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colPeriod")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colShowHours")}</Table.Th>
              <Table.Th ta="right">{t("ru", "billboards.colSlots")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colStatus")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {campaigns.map((c) => (
              <Table.Tr key={c._id}>
                <Table.Td>{c.name}</Table.Td>
                <Table.Td>{c.advertiser}</Table.Td>
                <Table.Td style={{ whiteSpace: "nowrap" }}>{formatPeriod(c.startDate, c.endDate)}</Table.Td>
                <Table.Td>{t("ru", "billboards.hoursRange", { from: hh(c.startHour), to: hh(c.endHour) })}</Table.Td>
                <Table.Td ta="right">{c.slotsPerCycle}</Table.Td>
                <Table.Td>
                  <Badge color={CAMPAIGN_STATUS_COLOR[c.status]} variant="light" tt="none">
                    {t("ru", `status.${c.status}`)}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Section>
  );
}

function Schedule({ hours }: { hours: Card["hours"] }) {
  return (
    <Section title={t("ru", "billboards.scheduleToday")}>
      <List listStyleType="none" spacing={6}>
        {hours.map((h) => (
          <List.Item key={h.hour}>
            <Group gap="md" wrap="nowrap" align="baseline">
              <Text w={HOUR_COLUMN_WIDTH} fw={500}>
                {t("ru", "billboards.hoursRange", { from: hh(h.hour), to: hh(h.hour + 1) })}
              </Text>
              <Text w={HOUR_COLUMN_WIDTH} size="sm" c="dimmed">
                {t("ru", "billboards.slotsUsed", { used: h.used, total: SLOTS_PER_CYCLE })}
              </Text>
              <Text size="sm" c={h.used === 0 ? "dimmed" : undefined}>
                {h.used === 0 ? t("ru", "slot.free") : h.campaigns.map((c) => c.name).join(", ")}
              </Text>
            </Group>
          </List.Item>
        ))}
      </List>
    </Section>
  );
}

function Audience({ card }: { card: Card }) {
  const { audience } = card;
  return (
    <Section title={t("ru", "billboards.audience")} aside={<DemoLabel />}>
      {audience === null ? (
        <Text c="dimmed">{t("ru", "billboards.noCamera")}</Text>
      ) : (
        <Paper withBorder p="md">
          <Text size="sm" c="dimmed" mb="sm">
            {t("ru", "billboards.period", { from: formatDate(card.from), to: formatDate(card.to) })}
          </Text>
          <SimpleGrid cols={3}>
            <Fact label={t("ru", "billboards.people")}>
              <Text fw={600}>{num(audience.people)}</Text>
            </Fact>
            <Fact label={t("ru", "billboards.looks")}>
              <Text fw={600}>{num(audience.looks)}</Text>
            </Fact>
            {audience.vehicles !== null && (
              <Fact label={t("ru", "billboards.vehicles")}>
                <Text fw={600}>{num(audience.vehicles)}</Text>
              </Fact>
            )}
          </SimpleGrid>
        </Paper>
      )}
    </Section>
  );
}

function Events({ events }: { events: Card["events"] }) {
  return (
    <Section title={t("ru", "billboards.events")}>
      {events.length === 0 ? (
        <Text c="dimmed">{t("ru", "billboards.noEvents")}</Text>
      ) : (
        <List listStyleType="none" spacing={6}>
          {events.map((e) => (
            <List.Item key={`${e.at}-${e.kind}`}>
              <Group gap="md" wrap="nowrap">
                <Text w={HOUR_COLUMN_WIDTH * 1.5} size="sm" c="dimmed">
                  {kzDateTime(e.at)}
                </Text>
                <Text size="sm">{t("ru", `screenEvents.${e.kind}`)}</Text>
              </Group>
            </List.Item>
          ))}
        </List>
      )}
    </Section>
  );
}
