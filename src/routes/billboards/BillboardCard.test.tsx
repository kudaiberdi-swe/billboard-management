import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConvexError } from "convex/values";
import { convex } from "../../test/fakeConvex";
import { theme } from "../../theme";
import { BillboardCard } from "./BillboardCard";

vi.mock("convex/react", () => import("../../test/fakeConvex"));

const AT_OFFLINE = Date.UTC(2026, 9, 27, 9, 5); // 14:05 in UTC+5

function card(over: { screen?: object; hours?: unknown[]; audience?: unknown; events?: unknown[] } = {}) {
  return {
    today: "2026-10-28",
    from: "2026-10-22",
    to: "2026-10-28",
    screen: { _id: "s1", code: "AST-001", name: "Экран Астана 1", city: "astana", address: "пр. Тестовый, 1", lat: 51.1, lng: 71.4, status: "online", workStartHour: 7, workEndHour: 23, imageKey: "screen-1", hasCamera: true, hasVehicleMetric: true, ...over.screen },
    occupancyTodayPercent: 8.3,
    campaigns: [
      { _id: "c1", name: "Летняя акция", advertiser: "Demo Cola", startDate: "2026-10-01", endDate: "2026-11-30", startHour: 8, endHour: 20, slotsPerCycle: 1, status: "active" },
      { _id: "c2", name: "Презентация автомобиля", advertiser: "Demo Auto", startDate: "2026-11-10", endDate: "2026-12-10", startHour: 8, endHour: 20, slotsPerCycle: 2, status: "planned" },
    ],
    hours: over.hours ?? Array.from({ length: 16 }, (_, i) => ({ hour: 7 + i, used: i === 0 ? 0 : 1, campaigns: i === 0 ? [] : [{ _id: "c1", name: "Летняя акция" }] })),
    audience: over.audience === undefined ? { people: 980, looks: 120, vehicles: 300 } : over.audience,
    events: over.events ?? [{ at: AT_OFFLINE, kind: "went_offline" }],
  };
}

beforeEach(() => convex.reset());

function open(value: unknown) {
  convex.set("screens:get", value);
  render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={["/billboards/s1"]}>
        <Routes>
          <Route path="/billboards/:id" element={<BillboardCard />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

const block = (name: string) => within(screen.getByRole("region", { name }));
const hourItems = () => within(screen.getByRole("region", { name: "Расписание на сегодня" })).getAllByRole("listitem");

test("[f03-04-billboards] card shows every required block", () => {
  open(card());
  expect(convex.calls["screens:get"].at(-1)).toMatchObject({ screenId: "s1" });
  expect(screen.getByRole("img", { name: "Экран Астана 1" }).getAttribute("src")).toBe("/demo/screens/screen-1.svg");
  expect(screen.getByRole("heading", { level: 1, name: "Экран Астана 1" })).toBeTruthy();
  for (const text of ["AST-001", "Астана", "пр. Тестовый, 1", "онлайн", "07:00–23:00", "8,3 %"]) expect(screen.getByText(text)).toBeTruthy();
  const campaigns = block("Кампании на экране");
  expect(campaigns.getByText("Летняя акция")).toBeTruthy();
  expect(campaigns.getByText("Активна")).toBeTruthy();
  expect(campaigns.getByText("Запланирована")).toBeTruthy();
  expect(hourItems()).toHaveLength(16);
  expect(block("Аудитория за 7 дней").getByText("Демонстрационные данные")).toBeTruthy();
  expect(block("Последние события").getByText("Экран недоступен")).toBeTruthy();
});

test("[f03-04-billboards] round-the-clock screen", () => {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, used: 0, campaigns: [] }));
  open(card({ screen: { workStartHour: 0, workEndHour: 24 }, hours }));
  expect(screen.getByText("Круглосуточно")).toBeTruthy();
  expect(hourItems()).toHaveLength(24);
  expect(hourItems()[23].textContent).toContain("23:00–24:00");
});

test("[f03-04-billboards] free hour shows Свободно", () => {
  open(card());
  const [free, busy] = hourItems();
  expect(free.textContent).toBe("07:00–08:000 из 12 слотовСвободно");
  expect(busy.textContent).toContain("1 из 12 слотов");
  expect(busy.textContent).toContain("Летняя акция");
});

test("[f03-04-billboards] unknown screen id", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  open(new ConvexError({ code: "NOT_FOUND", entity: "screens" }));
  expect(screen.getByText("Запись не найдена. Возможно, демо было сброшено.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "К списку билбордов" }).getAttribute("href")).toBe("/billboards");
  vi.mocked(console.error).mockRestore();
});

test("[f03-04-billboards] card shows the demo audience", () => {
  open(card());
  const audience = block("Аудитория за 7 дней");
  for (const text of ["Трафик: люди в зоне наблюдения", "980", "Взгляды на экран", "120", "Транспорт", "300", "Демонстрационные данные"]) {
    expect(audience.getByText(text)).toBeTruthy();
  }
});

test("[f03-04-billboards] card of a screen without a camera", () => {
  open(card({ screen: { hasCamera: false, hasVehicleMetric: false }, audience: null }));
  const audience = block("Аудитория за 7 дней");
  expect(audience.getByText("нет камеры")).toBeTruthy();
  expect(audience.queryByText("Трафик: люди в зоне наблюдения")).toBeNull();
  expect(audience.queryByText(/^[\d\s]+$/)).toBeNull(); // no number values
});

test("[f03-04-billboards] card of a screen without the vehicle metric", () => {
  open(card({ screen: { hasVehicleMetric: false }, audience: { people: 980, looks: 120, vehicles: null } }));
  const audience = block("Аудитория за 7 дней");
  expect(audience.getByText("980")).toBeTruthy();
  expect(audience.getByText("120")).toBeTruthy();
  expect(audience.queryByText("Транспорт")).toBeNull();
});

test("[f03-04-billboards] card shows recent screen events", () => {
  open(card({ screen: { status: "offline" } }));
  const events = block("Последние события");
  expect(events.getByText("Экран недоступен")).toBeTruthy();
  expect(events.getByText("27.10.2026 14:05")).toBeTruthy();
});

test("[f03-04-billboards] screen without events", () => {
  open(card({ events: [] }));
  expect(block("Последние события").getByText("Событий нет")).toBeTruthy();
});
