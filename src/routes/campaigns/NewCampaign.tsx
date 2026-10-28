// Campaign form (f06-campaign-create design «Screens»): fields, live availability and planned-shows preview, creative, save.
import { useState } from "react";
import {
  Alert,
  Button,
  Grid,
  Group,
  Image,
  FileInput,
  MultiSelect,
  Paper,
  Radio,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDebouncedValue } from "@mantine/hooks";
import { ConvexError } from "convex/values";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  CYCLE_SECONDS,
  MAX_PERIOD_DAYS,
  PLACEHOLDER_KEYS,
  SLOT_SECONDS,
  SLOTS_PER_CYCLE,
  VIDEO_MAX_BYTES,
  VIDEO_TYPES,
} from "../../../convex/lib/config";
import { fail } from "../../../convex/lib/errors";
import type { Conflict } from "../../../convex/lib/slots";
import { addDays, diffDays, isDate, kzNow } from "../../../convex/lib/time";
import { t, text, type StringsKey } from "../../../shared/strings";
import { errorCode } from "../../errors";
import { useGuardedMutation, useGuardedQuery, useSubmit } from "../../session";
import { conflictList, hh } from "./conflictList";

type Screen = { _id: Id<"screens">; code: string; name: string };
type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

const L = (key: StringsKey) => t("ru", key);
const field = (name: string) => L(`campaignForm.fields.${name}` as StringsKey);
const count = new Intl.NumberFormat("ru-RU");
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
const START_HOURS = range(0, 23).map((h) => ({ value: h, label: hh(Number(h)) }));
const END_HOURS = range(1, 24).map((h) => ({ value: h, label: hh(Number(h)) }));
const SLOTS = range(1, SLOTS_PER_CYCLE);
const DURATION_TOLERANCE = 0.5; // spec: 4.5–5.5 s

/** Duration of a local video file from its metadata; NaN when the browser cannot read it. */
function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    video.preload = "metadata";
    video.addEventListener("loadedmetadata", () => done(video.duration));
    video.addEventListener("error", () => done(Number.NaN));
    video.src = url;
  });
}

/** Fills the message params the server cannot: the field label and the conflict list. */
function readable(error: unknown, screens: Screen[]): unknown {
  if (!(error instanceof ConvexError)) return error;
  const data = error.data as { field?: unknown; conflicts?: Conflict[] };
  if (errorCode(error) === "INVALID_INPUT" && typeof data.field === "string")
    return new ConvexError({ code: "INVALID_INPUT", field: field(data.field) });
  if (errorCode(error) === "SLOT_CONFLICT" && data.conflicts)
    return new ConvexError({ code: "SLOT_CONFLICT", list: conflictList(data.conflicts, screens) });
  return error;
}

export function NewCampaign() {
  const navigate = useNavigate();
  const screens = useGuardedQuery(api.screens.options, {});
  const today = kzNow(Date.now()).date;
  const [name, setName] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 6));
  const [picked, setPicked] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(20);
  const [slotsPerCycle, setSlotsPerCycle] = useState(1);
  const [kind, setKind] = useState<"placeholder" | "video">("placeholder");
  const [key, setKey] = useState<PlaceholderKey>("placeholder-1");
  const [file, setFile] = useState<File | null>(null);
  const [video, setVideo] = useState<Id<"_storage">>();

  // Ids that vanished after a demo reset drop out of the choice.
  const screenIds = picked.filter((id) => screens?.some((s) => s._id === id)) as Id<"screens">[];
  const request = { startDate, endDate, startHour, endHour, slotsPerCycle, screenIds };
  // Only valid input reaches the preview query: a failing query would replace the page with the error.
  const ready =
    isDate(startDate) &&
    isDate(endDate) &&
    endDate >= startDate &&
    diffDays(startDate, endDate) + 1 <= MAX_PERIOD_DAYS &&
    endHour > startHour &&
    screenIds.length > 0;
  const [debounced] = useDebouncedValue(ready ? JSON.stringify(request) : "", 300);
  const preview = useGuardedQuery(api.campaigns.checkAvailability, debounced ? JSON.parse(debounced) : "skip");

  const uploadUrl = useGuardedMutation(api.campaigns.generateUploadUrl);
  const upload = useSubmit(async (f: File | null) => {
    setVideo(undefined);
    if (!f) return;
    const ok =
      (VIDEO_TYPES as readonly string[]).includes(f.type) &&
      f.size <= VIDEO_MAX_BYTES &&
      Math.abs((await videoDuration(f)) - SLOT_SECONDS) <= DURATION_TOLERANCE;
    if (!ok) fail("INVALID_CREATIVE");
    const url = await uploadUrl({});
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": f.type }, body: f });
    if (!res.ok) fail("UNKNOWN");
    setVideo(((await res.json()) as { storageId: Id<"_storage"> }).storageId);
  });

  const create = useGuardedMutation(api.campaigns.create);
  const save = useSubmit(async () => {
    if (kind === "video" && !video) fail("INVALID_CREATIVE");
    const creative = kind === "video" ? { kind, storageId: video! } : { kind, key };
    try {
      await create({ ...request, name, advertiser, creative });
    } catch (e) {
      throw readable(e, screens ?? []);
    }
    navigate("/campaigns");
  });

  const screenLabel = (id: string) => {
    const s = screens?.find((x) => x._id === id);
    return s ? `${s.code} ${s.name}` : id;
  };

  return (
    <Stack gap="lg" aria-busy={screens === undefined}>
      <Title order={1}>{L("campaignForm.title")}</Title>
      <Grid gap="xl" align="flex-start">
        <Grid.Col span={7}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save.submit();
            }}
          >
            <Stack gap="md">
              <SimpleGrid cols={2}>
                <TextInput label={field("name")} value={name} onChange={(e) => setName(e.target.value)} />
                <TextInput label={field("advertiser")} value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <DatePickerInput
                  label={field("startDate")}
                  valueFormat="DD.MM.YYYY"
                  value={startDate}
                  // fde-echo:local-only form draft; campaigns.create saves it on submit
                  onChange={(d) => setStartDate(d ?? "")}
                />
                <DatePickerInput
                  label={field("endDate")}
                  valueFormat="DD.MM.YYYY"
                  value={endDate}
                  minDate={startDate || undefined}
                  // fde-echo:local-only form draft; campaigns.create saves it on submit
                  onChange={(d) => setEndDate(d ?? "")}
                />
              </SimpleGrid>
              <MultiSelect
                label={field("screenIds")}
                data={(screens ?? []).map((s) => ({ value: s._id, label: `${s.code} ${s.name}` }))}
                value={screenIds}
                onChange={setPicked}
                disabled={screens === undefined}
                searchable
              />
              <SimpleGrid cols={3}>
                <Select
                  label={field("startHour")}
                  data={START_HOURS}
                  value={String(startHour)}
                  // fde-echo:local-only form draft; campaigns.create saves it on submit
                  onChange={(v) => v && setStartHour(Number(v))}
                  allowDeselect={false}
                />
                <Select
                  label={field("endHour")}
                  data={END_HOURS}
                  value={String(endHour)}
                  // fde-echo:local-only form draft; campaigns.create saves it on submit
                  onChange={(v) => v && setEndHour(Number(v))}
                  allowDeselect={false}
                />
                <Select
                  label={field("slotsPerCycle")}
                  description={t("ru", "campaignForm.slotsHint", { slot: SLOT_SECONDS, cycle: CYCLE_SECONDS })}
                  data={SLOTS}
                  value={String(slotsPerCycle)}
                  // fde-echo:local-only form draft; campaigns.create saves it on submit
                  onChange={(v) => v && setSlotsPerCycle(Number(v))}
                  allowDeselect={false}
                />
              </SimpleGrid>
              <Stack gap="xs" role="group" aria-labelledby="creative-label">
                <Text id="creative-label" size="sm" fw={500}>
                  {field("creative")}
                </Text>
                <SegmentedControl
                  value={kind}
                  onChange={(v) => setKind(v as typeof kind)}
                  data={[
                    { value: "placeholder", label: L("campaignForm.creativePlaceholder") },
                    { value: "video", label: L("campaignForm.creativeVideo") },
                  ]}
                  style={{ alignSelf: "flex-start" }}
                />
                {kind === "placeholder" ? (
                  <Radio.Group value={key} onChange={(v) => setKey(v as PlaceholderKey)}>
                    <SimpleGrid cols={4}>
                      {PLACEHOLDER_KEYS.map((k, i) => (
                        <Radio.Card key={k} value={k} p="xs" radius="sm">
                          <Image
                            src={`/demo/creatives/${k}.svg`}
                            alt={t("ru", "campaignForm.placeholderItem", { n: i + 1 })}
                            radius="xs"
                          />
                        </Radio.Card>
                      ))}
                    </SimpleGrid>
                  </Radio.Group>
                ) : (
                  <FileInput
                    aria-label={L("campaignForm.creativeVideo")}
                    accept={VIDEO_TYPES.join(",")}
                    value={file}
                    onChange={(f) => {
                      setFile(f);
                      void upload.submit(f);
                    }}
                    description={upload.busy ? L("campaignForm.uploading") : undefined}
                    error={upload.error}
                    clearable
                  />
                )}
              </Stack>
              {save.error && <Alert color="red">{save.error}</Alert>}
              <Group>
                <Button type="submit" loading={save.busy} disabled={upload.busy}>
                  {L("campaignForm.save")}
                </Button>
                {/* fde-echo:allow-dead link button: component={Link} navigates back to the list */}
                <Button component={Link} to="/campaigns" variant="default">
                  {L("campaignForm.cancel")}
                </Button>
              </Group>
            </Stack>
          </form>
        </Grid.Col>
        <Grid.Col span={5}>
          <Paper withBorder p="md" pos="sticky" top="var(--mantine-spacing-lg)">
            <Stack gap="sm" aria-busy={ready && preview === undefined} aria-live="polite">
              <Title order={2} size="h4">
                {L("campaignForm.plannedTitle")}
              </Title>
              {!ready ? (
                <Text c="dimmed" size="sm">
                  {L("campaignForm.previewEmpty")}
                </Text>
              ) : preview === undefined ? null : (
                <>
                  {preview.conflictCount === 0 ? (
                    <Alert color="green">{L("campaignForm.fits")}</Alert>
                  ) : (
                    <Alert color="red">
                      {text("ru", "errors.SLOT_CONFLICT", {
                        list: conflictList(preview.conflicts, screens ?? [], preview.conflictCount),
                      })}
                    </Alert>
                  )}
                  <Table style={{ fontVariantNumeric: "tabular-nums" }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{field("screenIds")}</Table.Th>
                        <Table.Th ta="right">{L("campaignForm.perScreenPerDay")}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {preview.byScreen.map((s) => (
                        <Table.Tr key={s.screenId}>
                          <Table.Td>{screenLabel(s.screenId)}</Table.Td>
                          <Table.Td ta="right">
                            {count.format(s.perDay)}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                    <Table.Tfoot>
                      <Table.Tr>
                        <Table.Th>{L("campaignForm.perDay")}</Table.Th>
                        <Table.Th ta="right">{count.format(preview.perDay)}</Table.Th>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Th>{L("campaignForm.perPeriod")}</Table.Th>
                        <Table.Th ta="right">{count.format(preview.total)}</Table.Th>
                      </Table.Tr>
                    </Table.Tfoot>
                  </Table>
                </>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
