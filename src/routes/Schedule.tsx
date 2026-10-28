// Schedule section (f07-schedule): city, billboard and date in the URL; the working hours of the day; an opened hour
// shows its 1-minute cycle of 12 slots. Slots come from schedule.day (shared hourSlots), never computed here.
import { Component, useState, type ReactNode } from "react";
import { Accordion, Alert, Anchor, Group, Loader, Paper, Select, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CITIES, type City } from "../../convex/lib/config";
import { kzNow } from "../../convex/lib/time";
import { t } from "../../shared/strings";
import { errorCode, errorText } from "../errors";
import { reportUnauthenticated, useGuardedQuery } from "../session";

const ALL = "all";
const two = (n: number) => String(n).padStart(2, "0");
const hourLabel = (h: number) => `${two(h)}:00`;
const isCity = (v: string | null): v is City => (CITIES as readonly unknown[]).includes(v);

export function Schedule() {
  const [params, setParams] = useSearchParams();
  const city = isCity(params.get("city")) ? (params.get("city") as City) : null;
  const screenId = params.get("screen");
  const date = params.get("date") ?? kzNow(Date.now()).date;
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
          data={options.filter((s) => city === null || s.city === city).map((s) => ({ value: s._id, label: `${s.code} ${s.name}` }))}
          value={screenId}
          onChange={(value) => update({ screen: value })}
          searchable
          miw={320}
        />
        <DatePickerInput
          label={t("ru", "schedule.date")}
          value={date}
          onChange={(value) => value && update({ date: value })}
          valueFormat="D MMMM YYYY"
          miw={200}
        />
      </Group>
      {screenId === null ? (
        <Text c="dimmed">{t("ru", "schedule.selectBillboard")}</Text>
      ) : (
        <DayErrors key={`${screenId}|${date}`}>
          <Day screenId={screenId} date={date} />
        </DayErrors>
      )}
    </Stack>
  );
}

function Day({ screenId, date }: { screenId: string; date: string }) {
  const day = useGuardedQuery(api.schedule.day, { screenId, date });
  const [open, setOpen] = useState<string[]>([]);
  if (day === undefined) return <Loader aria-label={t("ru", "common.loading")} />;
  return (
    <Accordion multiple value={open} onChange={setOpen} variant="separated">
      {day.hours.map(({ hour, used, slots }) => {
        const campaigns = [...new Map(slots.flatMap((s) => (s.campaignId ? [[s.campaignId, s.campaignName!] as const] : []))).entries()];
        return (
          <Accordion.Item key={hour} value={String(hour)}>
            <Group wrap="nowrap" gap="md" pr="md">
              <Accordion.Control>
                <Group gap="lg">
                  <Text fw={600} ff="monospace">
                    {t("ru", "schedule.hourRange", { from: hourLabel(hour), to: hourLabel(hour + 1) })}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t("ru", "schedule.slotsUsed", { used })}
                  </Text>
                </Group>
              </Accordion.Control>
              <Group gap="sm" wrap="nowrap">
                {campaigns.map(([id, name]) => (
                  <CampaignLink key={id} id={id} name={name} />
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
                      return s.campaignId ? (
                        <Paper key={s.index} data-state="occupied" p="xs" bg="var(--mantine-primary-color-light)">
                          <Text size="xs" ff="monospace">
                            {time}
                          </Text>
                          <CampaignLink id={s.campaignId} name={s.campaignName!} />
                        </Paper>
                      ) : (
                        <Paper key={s.index} data-state="free" p="xs" withBorder>
                          <Text size="xs" ff="monospace">
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

function CampaignLink({ id, name }: { id: Id<"campaigns">; name: string }) {
  return (
    <Anchor component={Link} to={`/campaigns/${id}`} size="sm" fw={500}>
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
