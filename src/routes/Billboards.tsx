// Billboards section (F-3): filters in the URL, the screen list from screens.list and the lazy map of the same rows.
import { lazy, Suspense, useRef, useState } from "react";
import { Alert, Anchor, Badge, Group, Image, Input, Loader, RangeSlider, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { errorText } from "../errors";
import { t, type StringsKey } from "../../shared/strings";
import { useGuardedQuery } from "../session";
import { formatDate, formatNumber as num } from "../format";
import { ADDRESS_WIDTH, MAP_HEIGHT, SCREEN_STATUS_COLOR, STATUS_COLUMN_WIDTH, THUMB_WIDTH } from "../theme";
import { Boundary } from "./billboards/Boundary";
import { workHours } from "./billboards/format";

const ScreensMap = lazy(() => import("./billboards/ScreensMap"));

const CITIES = ["astana", "karaganda", "atyrau", "east_kz"] as const;
const STATUSES = ["online", "offline"] as const;
const CAMERA = { yes: true, no: false } as const;
const SEARCH_MAX = 100;
const ALL = "all";

const pick = <T extends string>(values: readonly T[], v: string | null) => (values as readonly (string | null)[]).includes(v) ? (v as T) : undefined;

/** URL params -> screens.list args; unknown or out-of-range values are dropped. */
export function filtersFrom(params: URLSearchParams) {
  const bound = (key: string) => {
    const raw = params.get(key);
    const n = Number(raw);
    return raw !== null && raw !== "" && Number.isInteger(n) && n >= 0 && n <= 100 ? n : undefined;
  };
  let occupancyMin = bound("occMin");
  let occupancyMax = bound("occMax");
  if (occupancyMin !== undefined && occupancyMax !== undefined && occupancyMin > occupancyMax) occupancyMin = occupancyMax = undefined;
  const camera = pick(["yes", "no"] as const, params.get("camera"));
  const search = params.get("q")?.slice(0, SEARCH_MAX).trim() || undefined;
  return {
    city: pick(CITIES, params.get("city")),
    screenStatus: pick(STATUSES, params.get("status")),
    camera: camera && CAMERA[camera],
    occupancyMin,
    occupancyMax,
    search,
  };
}

const options = (keys: readonly string[], label: (k: string) => string) => [
  { value: ALL, label: t("ru", "billboards.all") },
  ...keys.map((k) => ({ value: k, label: label(k) })),
];

export function Billboards() {
  const [params, setParams] = useSearchParams();
  const filters = filtersFrom(params);
  const [q, setQ] = useState(params.get("q") ?? "");

  const setParam = (key: string, value: string | undefined) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === undefined || value === ALL || value === "") next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  const setSearch = useDebouncedCallback((value: string) => setParam("q", value.trim()), 300);

  const select = (key: string, label: StringsKey, data: { value: string; label: string }[]) => (
    <Select
      label={t("ru", label)}
      data={data}
      value={params.get(key) && data.some((o) => o.value === params.get(key)) ? params.get(key) : ALL}
      onChange={(v) => setParam(key, v ?? undefined)}
      allowDeselect={false}
    />
  );

  return (
    <Stack gap="lg">
      <Title order={1}>{t("ru", "routes.billboards")}</Title>

      <Group align="flex-end" gap="md" wrap="wrap">
        {select("city", "billboards.filterCity", options(CITIES, (c) => t("ru", `cities.${c as (typeof CITIES)[number]}`)))}
        {select("status", "billboards.filterStatus", options(STATUSES, (s) => t("ru", `status.${s as (typeof STATUSES)[number]}`)))}
        {select("camera", "billboards.filterCamera", options(["yes", "no"], (c) => t("ru", c === "yes" ? "billboards.cameraYes" : "billboards.cameraNo")))}
        <Input.Wrapper label={t("ru", "billboards.filterOccupancy")} miw={220}>
          <RangeSlider
            key={`${filters.occupancyMin}-${filters.occupancyMax}`}
            min={0}
            max={100}
            minRange={0}
            defaultValue={[filters.occupancyMin ?? 0, filters.occupancyMax ?? 100]}
            onChangeEnd={([min, max]) =>
              setParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  for (const [key, value, edge] of [["occMin", min, 0], ["occMax", max, 100]] as const) {
                    if (value === edge) next.delete(key);
                    else next.set(key, String(value));
                  }
                  return next;
                },
                { replace: true },
              )
            }
            thumbFromLabel={t("ru", "billboards.occupancyFrom")}
            thumbToLabel={t("ru", "billboards.occupancyTo")}
            label={(v) => `${v}`}
            my="xs"
          />
        </Input.Wrapper>
        <TextInput
          label={t("ru", "billboards.search")}
          type="search"
          value={q}
          maxLength={SEARCH_MAX}
          /* fde-echo:local-only read-only filter: the text goes to the URL param q (debounced), which screens.list reads; nothing is saved */
          onChange={(e) => {
            setQ(e.currentTarget.value);
            setSearch(e.currentTarget.value);
          }}
          style={{ flex: 1 }}
          miw={240}
        />
      </Group>

      <Boundary fallback={(error) => <Alert color="red">{errorText(error)}</Alert>}>
        <ScreenList filters={filters} />
      </Boundary>
    </Stack>
  );
}

function ScreenList({ filters }: { filters: ReturnType<typeof filtersFrom> }) {
  const fresh = useGuardedQuery(api.screens.list, filters);
  // Keep the previous rows on screen while new filter results load, so the map is not remounted.
  const kept = useRef(fresh);
  if (fresh !== undefined) kept.current = fresh;
  const data = kept.current;
  const busy = fresh === undefined;

  if (data === undefined) return <Busy />;

  return (
    <Stack gap="md" aria-busy={busy}>
      <Boundary fallback={() => <MapUnavailable />}>
        <Suspense fallback={<Busy />}>
          <ScreensMap screens={data.rows} />
        </Suspense>
      </Boundary>

      <Text c="dimmed">{t("ru", "billboards.period", { from: formatDate(data.from), to: formatDate(data.to) })}</Text>

      {data.rows.length === 0 ? (
        <Text py="xl" ta="center" c="dimmed">
          {t("ru", "billboards.empty")}
        </Text>
      ) : (
        // sticky header: 100 rows stay readable without paging; no scroll container, so it sticks to the page
        <Table striped highlightOnHover verticalSpacing="xs" stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("ru", "billboards.colImage")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colName")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colLocation")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colStatus")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colHours")}</Table.Th>
              <Table.Th ta="right">{t("ru", "billboards.colOccupancy")}</Table.Th>
              <Table.Th ta="right">{t("ru", "billboards.colActiveCampaigns")}</Table.Th>
              <Table.Th>{t("ru", "billboards.colCamera")}</Table.Th>
              <Table.Th ta="right">{t("ru", "billboards.colAudience")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.rows.map((r) => (
              <Table.Tr key={r._id}>
                <Table.Td>
                  <Image src={`/demo/screens/${r.imageKey}.svg`} alt={r.name} w={THUMB_WIDTH} radius="sm" />
                </Table.Td>
                <Table.Td>
                  <Anchor component={Link} to={`/billboards/${r._id}`} fw={500}>
                    {r.name}
                  </Anchor>
                  {/* seed names start with the code; show it apart only when they do not */}
                  {!r.name.startsWith(r.code) && (
                    <Text size="sm" c="dimmed">
                      {r.code}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{t("ru", `cities.${r.city}`)}</Text>
                  <Text size="sm" c="dimmed" truncate="end" maw={ADDRESS_WIDTH} title={r.address}>
                    {r.address}
                  </Text>
                </Table.Td>
                <Table.Td miw={STATUS_COLUMN_WIDTH} style={{ whiteSpace: "nowrap" }}>
                  <Badge color={SCREEN_STATUS_COLOR[r.status]} variant="light" tt="none">
                    {t("ru", `status.${r.status}`)}
                  </Badge>
                </Table.Td>
                <Table.Td>{workHours(r.workStartHour, r.workEndHour)}</Table.Td>
                <Table.Td ta="right">{num(r.occupancyPercent)}</Table.Td>
                <Table.Td ta="right">{r.activeCampaigns}</Table.Td>
                <Table.Td>{t("ru", r.hasCamera ? "billboards.cameraYes" : "billboards.cameraNo")}</Table.Td>
                <Table.Td ta="right">{r.audience === null ? t("ru", "billboards.noCamera") : num(r.audience)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

function Busy() {
  return (
    <Stack h={MAP_HEIGHT} aria-busy="true" align="center" justify="center">
      <Loader aria-label={t("ru", "common.loading")} />
    </Stack>
  );
}

function MapUnavailable() {
  return (
    <Stack h={MAP_HEIGHT} align="center" justify="center" bg="gray.1">
      <Text c="dimmed">{t("ru", "billboards.mapUnavailable")}</Text>
    </Stack>
  );
}
