// Schedule section (f07-schedule): city, billboard and date in the URL; the working hours of the day; an opened hour
// shows its 1-minute cycle of 12 slots. Slots come from schedule.day (shared hourSlots), never computed here.
// `campaign=<id>` (link from the campaign card) marks that campaign's slots and opens its first hour.
import { Component, useState, type ReactNode } from "react";
import { Accordion, Alert, Anchor, Group, Loader, Paper, Select, SimpleGrid, Stack, Text, Title, VisuallyHidden } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CITIES, SLOTS_PER_CYCLE, type City } from "../../convex/lib/config";
import { kzNow } from "../../convex/lib/time";
import { t } from "../../shared/strings";
import { errorCode, errorText } from "../errors";
import { formatHour as hourLabel, screenTitle } from "../format";
import { reportUnauthenticated, useGuardedQuery } from "../session";
import { DATE_FORMAT, SCHEDULE_NAME_WIDTH } from "../theme";

const ALL = "all";
const two = (n: number) => String(n).padStart(2, "0");
const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;
const isCity = (v: string | null): v is City => (CITIES as readonly unknown[]).includes(v);

export function Schedule() {
  const [params, setParams] = useSearchParams();
  const city = isCity(params.get("city")) ? (params.get("city") as City) : null;
  const screenId = params.get("screen");
  const date = params.get("date") ?? kzNow(Date.now()).date;
  const marked = params.get("campaign");
  const options = useGuardedQuery(api.screens.options, {}) ?? [];

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  }

  function selectCity(value: string | null) {
    const nextCity = isCity(value) ? value : null;
    const selected = options.find((s) => s._id === screenId);
    const foreign = nextCity !== null && selected !== undefined && selected.city !== nextCity;
    update({ city: nextCity, ...(foreign ? { screen: null } : {}) });
  }

  return (
    <Stack gap="lg">
      <Title order={1}>{t("ru", "routes.schedule")}</Title>
      <Group align="flex-end" gap="md">
        <Select
          label={t("ru", "schedule.city")}
          data={[
            { value: ALL, label: t("ru", "schedule.allCities") },
            ...CITIES.map((c) => ({ value: c, label: t("ru", `cities.${c}`) })),
          ]}
          value={city ?? ALL}
          onChange={selectCity}
          allowDeselect={false}
        />
        <Select
          label={t("ru", "schedule.billboard")}
          data={options.filter((s) => city === null || s.city === city).map((s) => ({ value: s._id, label: screenTitle(s) }))}
          value={screenId}
          onChange={(value) => update({ screen: value })}
          searchable
          miw={320}
        />
        <DatePickerInput
          label={t("ru", "schedule.date")}
          value={date}
          onChange={(value) => value && update({ date: value })}
          valueFormat={DATE_FORMAT}
        />
      </Group>
      {screenId === null ? (
        <Text c="dimmed">{t("ru", "schedule.selectBillboard")}</Text>
      ) : (
        <DayErrors key={`${screenId}|${date}`}>
          <Day screenId={screenId} date={date} marked={marked} />
        </DayErrors>
      )}
    </Stack>
  );
}

function Day({ screenId, date, marked }: { screenId: string; date: string; marked: string | null }) {
  const day = useGuardedQuery(api.schedule.day, { screenId, date });
  const [picked, setPicked] = useState<string[]>();
  if (day === undefined) return <Loader aria-label={t("ru", "common.loading")} />;
  // Until the visitor opens or closes an hour, the first hour of the marked campaign is open.
  const first = marked ? day.hours.find((h) => h.slots.some((s) => s.campaignId === marked)) : undefined;
  const open = picked ?? (first ? [String(first.hour)] : []);
  return (
    <Accordion multiple value={open} onChange={setPicked} variant="separated" chevronPosition="left">
      {day.hours.map(({ hour, used, slots }) => {
        const campaigns = [...new Map(slots.flatMap((s) => (s.campaignId ? [[s.campaignId, s.campaignName!] as const] : []))).entries()];
        return (
          <Accordion.Item key={hour} value={String(hour)}>
            {/* the chevron sits left at one x on every row; campaign links stay outside the button (no nested controls) */}
            <Group wrap="nowrap" gap="md" pr="md">
              <Accordion.Control style={{ flex: "none", width: "auto" }}>
                <Group gap="lg" wrap="nowrap">
                  <Text fw={600} style={NUMERIC}>
                    {t("ru", "schedule.hourRange", { from: hourLabel(hour), to: hourLabel(hour + 1) })}
                  </Text>
                  <Text size="sm" c="dimmed" style={NUMERIC}>
                    {t("ru", "schedule.slotsUsed", { used, total: SLOTS_PER_CYCLE })}
                  </Text>
                </Group>
              </Accordion.Control>
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                {campaigns.map(([id, name]) => (
                  <CampaignLink key={id} id={id} name={name} strong={id === marked} truncate />
                ))}
              </Group>
            </Group>
            <Accordion.Panel>
              {open.includes(String(hour)) && (
                <Stack gap="xs">
                  <Title order={3} size="h5">
                    {t("ru", "schedule.cycleTitle")}
                  </Title>
                  <SimpleGrid cols={6} spacing="xs">
                    {slots.map((s) => {
                      const time = t("ru", "schedule.slotTime", { from: two(s.startSec), to: two(s.endSec) });
                      const own = s.campaignId !== null && s.campaignId === marked;
                      return s.campaignId ? (
                        <Paper
                          key={s.index}
                          data-state="occupied"
                          data-marked={own || undefined}
                          p="xs"
                          bg={own ? "var(--mantine-primary-color-filled)" : "var(--mantine-primary-color-light)"}
                          c={own ? "var(--mantine-primary-color-contrast)" : undefined}
                        >
                          <Text size="xs" style={NUMERIC}>
                            {time}
                          </Text>
                          <CampaignLink id={s.campaignId} name={s.campaignName!} inverse={own} />
                          {own && <VisuallyHidden>{t("ru", "schedule.marked")}</VisuallyHidden>}
                        </Paper>
                      ) : (
                        <Paper key={s.index} data-state="free" p="xs" withBorder>
                          <Text size="xs" style={NUMERIC}>
                            {time}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {t("ru", "slot.free")}
                          </Text>
                        </Paper>
                      );
                    })}
                  </SimpleGrid>
                </Stack>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

type LinkLook = { strong?: boolean; inverse?: boolean; truncate?: boolean };

/** `strong`: the marked campaign in an hour row; `inverse`: on the filled slot; `truncate`: one line in an hour row. */
function CampaignLink({ id, name, strong, inverse, truncate }: { id: Id<"campaigns">; name: string } & LinkLook) {
  return (
    <Anchor
      component={Link}
      to={`/campaigns/${id}`}
      size="sm"
      fw={strong ? 700 : 500}
      c={inverse ? "inherit" : undefined}
      underline={inverse ? "always" : undefined}
      truncate={truncate ? "end" : undefined}
      maw={truncate ? SCHEDULE_NAME_WIDTH : undefined}
      title={truncate ? name : undefined}
      display={truncate ? "block" : undefined}
    >
      {name}
    </Anchor>
  );
}

/** schedule.day fails during render: UNAUTHENTICATED goes to the password screen, other codes show their text and keep the pickers. */
class DayErrors extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {};
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    if (errorCode(error) === "UNAUTHENTICATED") reportUnauthenticated();
  }
  render() {
    if (this.state.error === undefined) return this.props.children;
    if (errorCode(this.state.error) === "UNAUTHENTICATED") return null;
    return (
      <Alert color="red" role="alert">
        {errorText(this.state.error)}
      </Alert>
    );
  }
}
