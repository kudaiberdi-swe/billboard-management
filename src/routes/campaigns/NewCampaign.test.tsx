import { useSyncExternalStore } from "react";
import { beforeEach, expect, test, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ConvexError } from "convex/values";
import { Gate } from "../../shell/Gate";
import { theme } from "../../theme";

// Fake Convex: query results by function name (reactive), the last args per query, mutations as mocks.
const convex = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const queries: Record<string, unknown> = {};
  return {
    queries,
    args: {} as Record<string, unknown>,
    mutations: {} as Record<string, Mock<(args: unknown) => Promise<unknown>>>,
    set(name: string, value: unknown) {
      queries[name] = value;
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server");
  return {
    useQuery: (ref: never, args: unknown) => {
      const name = getFunctionName(ref);
      const value = useSyncExternalStore(convex.subscribe, () => convex.queries[name]);
      convex.args[name] = args;
      if (args === "skip") return undefined;
      return value;
    },
    useMutation: (ref: never) => (args: unknown) => convex.mutations[getFunctionName(ref)](args),
  };
});

const SCREENS = [
  { _id: "s1", code: "AST-001", name: "Demo Экран 1", city: "astana", status: "online" },
  { _id: "s2", code: "AST-002", name: "Demo Экран 2", city: "astana", status: "online" },
];
const FITS = { conflicts: [], conflictCount: 0, perDay: 720, total: 5040, byScreen: [{ screenId: "s1", perDay: 720 }] };
const VIDEO_TEXT = "Загрузите видео MP4 или WebM длительностью 5 секунд, до 20 МБ.";

beforeEach(() => {
  convex.set("demo:sessionStatus", { valid: true });
  convex.set("screens:options", SCREENS);
  convex.set("campaigns:checkAvailability", FITS);
  convex.mutations["campaigns:create"] = vi.fn().mockResolvedValue("c1");
  convex.mutations["campaigns:generateUploadUrl"] = vi.fn().mockResolvedValue("https://upload.test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ storageId: "f1" }) }));
});

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function open(path = "/campaigns/new") {
  render(
    <MantineProvider theme={theme} env="test">
      <MemoryRouter initialEntries={[path]}>
        <Gate />
        <Where />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const path = () => screen.getByTestId("path").textContent;
const save = () => fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

function pickScreen(label: string) {
  fireEvent.click(screen.getByLabelText("Экраны", { selector: "input" }));
  fireEvent.click(screen.getByRole("option", { name: label }));
}

/** jsdom does not load media: every <video> reports this duration as soon as it gets a src. */
function stubVideo(duration: number) {
  URL.createObjectURL = vi.fn(() => "blob:video");
  URL.revokeObjectURL = vi.fn();
  Object.defineProperty(HTMLMediaElement.prototype, "duration", { configurable: true, get: () => duration });
  Object.defineProperty(HTMLMediaElement.prototype, "src", {
    configurable: true,
    set(this: HTMLMediaElement) {
      setTimeout(() => this.dispatchEvent(new Event("loadedmetadata")));
    },
  });
}

function pickVideo(type = "video/mp4") {
  fireEvent.click(screen.getByLabelText("Видео 5 сек."));
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [new File(["x"], "clip.mp4", { type })] } });
}

test("[f06-campaign-create] form shows all fields", () => {
  open();
  for (const label of ["Название", "Рекламодатель", "Дата начала", "Дата окончания", "Экраны", "Начало показа", "Конец показа", "Слотов в минутном цикле"]) {
    expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
  }
  expect(screen.getByRole("group", { name: "Креатив" })).toBeTruthy();

  fireEvent.click(screen.getByLabelText("Экраны", { selector: "input" }));
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["AST-001 Demo Экран 1", "AST-002 Demo Экран 2"]);
  pickScreen("AST-001 Demo Экран 1");
  pickScreen("AST-002 Demo Экран 2");
  expect(convex.args["campaigns:checkAvailability"]).toBe("skip"); // debounced
  return waitFor(() =>
    expect(convex.args["campaigns:checkAvailability"]).toMatchObject({ screenIds: ["s1", "s2"], startHour: 8, endHour: 20 }),
  );
});

test("[f06-campaign-create] form opens from the campaigns section", () => {
  open("/campaigns");
  fireEvent.click(screen.getByRole("link", { name: "Создать кампанию" }));
  expect(path()).toBe("/campaigns/new");
  expect(screen.getByRole("heading", { name: "Новая кампания" })).toBeTruthy();
  const menu = within(screen.getByRole("navigation"));
  expect(menu.getByRole("link", { name: "Рекламные кампании" }).hasAttribute("data-active")).toBe(true);
});

test("[f06-campaign-create] field error names the form field", async () => {
  convex.mutations["campaigns:create"].mockRejectedValue(new ConvexError({ code: "INVALID_INPUT", field: "endDate" }));
  open();
  save();
  expect(await screen.findByText("Проверьте поле: Дата окончания.")).toBeTruthy();
  expect(path()).toBe("/campaigns/new");
});

test("[f06-campaign-create] slot choice follows the cycle setting", () => {
  open();
  expect(screen.getByText("1 слот = 5 сек. в цикле 60 сек.")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Слотов в минутном цикле", { selector: "input" }));
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(
    Array.from({ length: 12 }, (_, i) => String(i + 1)),
  );
});

test("[f06-campaign-create] form offers the placeholders", () => {
  open();
  expect(screen.getAllByRole("img").map((i) => i.getAttribute("src"))).toEqual(
    [1, 2, 3, 4].map((n) => `/demo/creatives/placeholder-${n}.svg`),
  );
  expect(screen.getByRole("radio", { name: "Макет 1" }).getAttribute("aria-checked")).toBe("true");
  expect(screen.getByRole("radio", { name: "Макет 2" }).getAttribute("aria-checked")).toBe("false");
  expect(screen.getByLabelText("Видео 5 сек.")).toBeTruthy();
});

test("[f06-campaign-create] video of another length is blocked in the browser", async () => {
  stubVideo(8);
  open();
  pickVideo();
  expect(await screen.findByText(VIDEO_TEXT)).toBeTruthy();
  expect(convex.mutations["campaigns:generateUploadUrl"]).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test("[f06-campaign-create] sixth upload URL in a burst", async () => {
  stubVideo(5);
  convex.mutations["campaigns:generateUploadUrl"].mockRejectedValue(
    new ConvexError({ kind: "RateLimited", name: "upload", retryAfter: 90_000 }),
  );
  open();
  pickVideo();
  expect(await screen.findByText("Слишком много попыток. Повторите через 2 мин.")).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

test("[f06-campaign-create] preview is shown before save", async () => {
  open();
  expect(screen.getByText("Выберите экраны, даты и часы показа, чтобы проверить свободные слоты.")).toBeTruthy();
  pickScreen("AST-001 Demo Экран 1");
  expect(await screen.findByText("Свободных слотов достаточно")).toBeTruthy();
  const preview = within(screen.getByRole("table"));
  expect(preview.getByRole("row", { name: "AST-001 Demo Экран 1 720" })).toBeTruthy();
  expect(preview.getByRole("row", { name: "Всего в день 720" })).toBeTruthy();
  expect(preview.getByRole("row", { name: /^За период 5\s040$/ })).toBeTruthy();

  convex.set("campaigns:checkAvailability", {
    ...FITS,
    conflicts: [{ screenId: "s1", date: "2026-11-03", hour: 10, free: 2, requested: 3 }],
    conflictCount: 1,
  });
  expect(
    await screen.findByText("Недостаточно свободных слотов. Конфликт: AST-001 Demo Экран 1: 03.11.2026, 10:00–11:00."),
  ).toBeTruthy();
  expect(convex.mutations["campaigns:create"]).not.toHaveBeenCalled();
});

test("[f06-campaign-create] conflict blocks the save", async () => {
  convex.mutations["campaigns:create"].mockRejectedValue(
    new ConvexError({ code: "SLOT_CONFLICT", conflicts: [{ screenId: "s1", date: "2026-11-03", hour: 10, free: 2, requested: 3 }] }),
  );
  open();
  fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Demo Осенняя акция" } });
  pickScreen("AST-001 Demo Экран 1");
  save();
  const alerts = await screen.findAllByText(
    "Недостаточно свободных слотов. Конфликт: AST-001 Demo Экран 1: 03.11.2026, 10:00–11:00.",
  );
  expect(alerts.length).toBeGreaterThan(0);
  expect(convex.mutations["campaigns:create"]).toHaveBeenCalledTimes(1);
  expect((screen.getByLabelText("Название") as HTMLInputElement).value).toBe("Demo Осенняя акция");
  expect(path()).toBe("/campaigns/new");
});

test("[f06-campaign-create] form returns to the campaigns list", async () => {
  open();
  fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Demo Осенняя акция" } });
  fireEvent.change(screen.getByLabelText("Рекламодатель"), { target: { value: "Demo Cola" } });
  pickScreen("AST-001 Demo Экран 1");
  save();
  await waitFor(() => expect(path()).toBe("/campaigns"));
  expect(convex.mutations["campaigns:create"]).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Demo Осенняя акция",
      advertiser: "Demo Cola",
      screenIds: ["s1"],
      startHour: 8,
      endHour: 20,
      slotsPerCycle: 1,
      creative: { kind: "placeholder", key: "placeholder-1" },
    }),
  );
});
