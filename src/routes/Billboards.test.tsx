import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, useLocation } from "react-router-dom";
import { convex } from "../test/fakeConvex";
import { theme } from "../theme";
import { AppShell } from "../shell/AppShell";

vi.mock("convex/react", () => import("../test/fakeConvex"));

// jsdom has no map engine: react-leaflet is replaced by plain elements; ScreensMap itself is the real module.
const map = vi.hoisted(() => ({ fail: false }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => {
    if (map.fail) throw new Error("map failed");
    return <div data-testid="map">{children}</div>;
  },
  TileLayer: ({ attribution }: { attribution: string }) => <div data-testid="tiles" dangerouslySetInnerHTML={{ __html: attribution }} />,
  Marker: (p: { title: string; position: [number, number]; eventHandlers: { click: () => void } }) => (
    <button data-testid="marker" aria-label={p.title} data-position={p.position.join(",")} onClick={p.eventHandlers.click} />
  ),
  useMap: () => ({ fitBounds: () => {} }),
}));

type Args = { city?: string; screenStatus?: string; camera?: boolean; search?: string };
const ROWS = [
  { _id: "s1", code: "AST-001", name: "Экран Астана 1", city: "astana", address: "пр. Тестовый, 1", lat: 51.1, lng: 71.4, status: "online", workStartHour: 7, workEndHour: 23, imageKey: "screen-1", hasCamera: true, occupancyPercent: 8.3, activeCampaigns: 2, audience: 980 },
  { _id: "s2", code: "KRG-001", name: "Экран Караганда 1", city: "karaganda", address: "ул. Учебная, 5", lat: 49.8, lng: 73.1, status: "offline", workStartHour: 0, workEndHour: 24, imageKey: "screen-2", hasCamera: false, occupancyPercent: 0, activeCampaigns: 0, audience: null },
  { _id: "s3", code: "AST-002", name: "Экран Астана 2", city: "astana", address: "ул. Пробная, 9", lat: 51.2, lng: 71.5, status: "offline", workStartHour: 8, workEndHour: 20, imageKey: "screen-3", hasCamera: true, occupancyPercent: 25, activeCampaigns: 1, audience: 400 },
  { _id: "s4", code: "KRG-002", name: "Экран Караганда 2", city: "karaganda", address: "ул. Демо, 2", lat: 49.9, lng: 73.2, status: "online", workStartHour: 8, workEndHour: 20, imageKey: "screen-4", hasCamera: true, occupancyPercent: 50, activeCampaigns: 1, audience: 500 },
];

// Applies the filters like the server, so the page shows what screens.list would return.
const list = (a: Args) => ({
  from: "2026-10-22",
  to: "2026-10-28",
  rows: ROWS.filter(
    (r) =>
      (a.city === undefined || r.city === a.city) &&
      (a.screenStatus === undefined || r.status === a.screenStatus) &&
      (a.camera === undefined || r.hasCamera === a.camera) &&
      (a.search === undefined || [r.name, r.code, r.address].some((f) => f.toLowerCase().includes(a.search!.toLowerCase()))),
  ),
});

beforeEach(() => {
  convex.reset();
  map.fail = false;
  convex.set("screens:list", list);
  convex.set("screens:get", undefined);
});

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="path">{pathname + search}</output>;
}

function open(path: string) {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell />
        <Where />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const path = () => screen.getByTestId("path").textContent!;
const lastList = () => convex.calls["screens:list"].at(-1) as Args;
const rowOf = (name: string) => screen.getByRole("link", { name }).closest("tr")!;
const listedNames = () => screen.queryAllByRole("row").slice(1).map((r) => within(r).getByRole("link").textContent);

async function choose(label: string, option: string) {
  fireEvent.click(screen.getByLabelText(label, { selector: "input" }));
  fireEvent.click(await screen.findByRole("option", { name: option, hidden: true }));
}

test("[f03-04-billboards] list row shows every required field", async () => {
  open("/billboards");
  const row = within((await screen.findByRole("link", { name: "Экран Астана 1" })).closest("tr")!);
  expect(row.getByRole("img", { name: "Экран Астана 1" }).getAttribute("src")).toBe("/demo/screens/screen-1.svg");
  for (const text of ["AST-001", "Астана", "пр. Тестовый, 1", "онлайн", "07:00–23:00", "8,3", "2", "есть", "980"]) {
    expect(row.getByText(text)).toBeTruthy();
  }
  expect(within(rowOf("Экран Караганда 1")).getByText("офлайн")).toBeTruthy();
  expect(within(rowOf("Экран Караганда 1")).getByText("Круглосуточно")).toBeTruthy();
  expect(screen.getByText("Демонстрационные данные")).toBeTruthy();
  expect(screen.getByText("Период: 2026-10-22 – 2026-10-28")).toBeTruthy();
});

test("[f03-04-billboards] screen without a camera shows нет камеры", async () => {
  open("/billboards");
  const row = within((await screen.findByRole("link", { name: "Экран Караганда 1" })).closest("tr")!);
  expect(row.getByText("нет")).toBeTruthy();
  expect(row.getByText("нет камеры")).toBeTruthy();
});

test("[f03-04-billboards] filters combine and survive refresh", async () => {
  const first = open("/billboards");
  await screen.findByRole("link", { name: "Экран Астана 1" });
  await choose("Город", "Астана");
  await choose("Статус", "онлайн");
  await waitFor(() => expect(lastList()).toMatchObject({ city: "astana", screenStatus: "online" }));
  const url = path();
  expect(url).toBe("/billboards?city=astana&status=online");

  first.unmount(); // reload: a fresh app at the same URL
  open(url);
  await screen.findByRole("link", { name: "Экран Астана 1" });
  expect((screen.getByLabelText("Город", { selector: "input" }) as HTMLInputElement).value).toBe("Астана");
  expect((screen.getByLabelText("Статус", { selector: "input" }) as HTMLInputElement).value).toBe("онлайн");
  expect(lastList()).toMatchObject({ city: "astana", screenStatus: "online" });
  expect(listedNames()).toEqual(["Экран Астана 1"]);
});

test("[f03-04-billboards] map shows a marker per listed screen", async () => {
  open("/billboards?city=karaganda");
  const markers = await screen.findAllByTestId("marker");
  expect(markers.map((m) => [m.getAttribute("aria-label"), m.getAttribute("data-position")])).toEqual([
    ["Экран Караганда 1", "49.8,73.1"],
    ["Экран Караганда 2", "49.9,73.2"],
  ]);
  expect(screen.getByTestId("tiles").textContent).toContain("© OpenStreetMap contributors");
});

test("[f03-04-billboards] marker opens the card", async () => {
  open("/billboards");
  fireEvent.click(await screen.findByRole("button", { name: "Экран Астана 2" }));
  expect(path()).toBe("/billboards/s3");
});

test("[f03-04-billboards] no screen matches", async () => {
  open("/billboards?q=несуществующий");
  expect(await screen.findByText("Ничего не найдено")).toBeTruthy();
  await screen.findByTestId("map");
  expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  expect(screen.queryByRole("table")).toBeNull();
});

test("[f03-04-billboards] list stays usable when the map fails", async () => {
  map.fail = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  open("/billboards");
  expect(await screen.findByText("Карта недоступна. Список работает.")).toBeTruthy();
  expect(listedNames()).toHaveLength(4);

  fireEvent.change(screen.getByRole("searchbox", { name: "Поиск по названию или адресу" }), { target: { value: "  УЧЕБНАЯ " } });
  await waitFor(() => expect(listedNames()).toEqual(["Экран Караганда 1"]));
  expect(lastList()).toMatchObject({ search: "УЧЕБНАЯ" });

  await choose("Камера", "есть");
  await waitFor(() => expect(lastList()).toMatchObject({ camera: true }));
  expect(screen.getByText("Ничего не найдено")).toBeTruthy();
  vi.mocked(console.error).mockRestore();
});

test("[f03-04-billboards] row opens the card", async () => {
  open("/billboards");
  fireEvent.click(await screen.findByRole("link", { name: "Экран Астана 1" }));
  expect(path()).toBe("/billboards/s1");
  const current = within(screen.getByRole("navigation"))
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page");
  expect(current.map((link) => link.textContent)).toEqual(["Билборды"]);
  expect(convex.calls["screens:get"].at(-1)).toMatchObject({ screenId: "s1" });
});
