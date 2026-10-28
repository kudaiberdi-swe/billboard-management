// «Главная» UI scenarios (f02-dashboard). The backend values are covered by convex/dashboard.test.ts;
// here a fake Convex returns fixed values and records the args the page sends.
import { useSyncExternalStore } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ConvexError } from "convex/values";
import "dayjs/locale/ru";
import { theme } from "../../theme";
import { Home } from "../Home";

const convex = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const queries: Record<string, unknown> = {};
  return {
    queries,
    calls: [] as { name: string; args: Record<string, unknown> }[],
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
    useQuery: (ref: never, args: Record<string, unknown>) => {
      const name = getFunctionName(ref);
      const value = useSyncExternalStore(convex.subscribe, () => convex.queries[name]);
      convex.calls.push({ name, args });
      if (value instanceof Error) throw value;
      return value;
    },
    useMutation: () => vi.fn(),
  };
});

const AST1 = "ast1" as never;
const KRG1 = "krg1" as never;

const summary = (days: string[]) => ({
  screens: { total: 100, online: 97, offline: 3 },
  activeCampaigns: 2,
  occupancy: { percent: 18.8, occupied: 36, total: 192 },
  plannedShows: 5400,
  logShows: 4200,
  contacts: 1234,
  looks: 5678,
  occupancyByDay: days.map((date, i) => ({ date, percent: 10 + i })),
  screensByCity: [
    { city: "astana", count: 40 },
    { city: "karaganda", count: 25 },
    { city: "atyrau", count: 20 },
    { city: "east_kz", count: 15 },
  ],
  activeList: [
    { _id: "c1", name: "Летняя акция", advertiser: "Demo Cola", endDate: "2026-11-17" },
    { _id: "c2", name: "Открытие магазина", advertiser: "Demo Market", endDate: "2026-11-07" },
  ],
});
const WEEK = ["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"];

beforeEach(() => {
  convex.calls.length = 0;
  convex.set("dashboard:summary", summary(WEEK));
  convex.set("dashboard:notifications", []);
  convex.set("screens:options", [
    { _id: AST1, code: "AST-001", name: "AST-001 Есиль", city: "astana", status: "online" },
    { _id: KRG1, code: "KRG-001", name: "KRG-001 Центр", city: "karaganda", status: "offline" },
  ]);
});

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="url">{pathname + search}</output>;
}

function open(path = "/") {
  render(
    <MantineProvider theme={theme} env="test">
      <DatesProvider settings={{ locale: "ru" }}>
        <MemoryRouter initialEntries={[path]}>
          <Home />
          <Where />
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>,
  );
}

const card = (name: string) => screen.getByRole("group", { name });
const value = (name: string) => within(card(name)).getAllByText(/\d/)[0].textContent;
const region = (name: string) => screen.getByRole("region", { name });
const lastSummaryArgs = () => convex.calls.filter((c) => c.name === "dashboard:summary").at(-1)!.args;
const url = () => screen.getByTestId("url").textContent!;

async function pick(label: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

test("[f02-dashboard] cards show the network values", () => {
  open();
  expect(value("Экраны в сети")).toBe("100");
  expect(value("Онлайн")).toBe("97");
  expect(value("Офлайн")).toBe("3");
  expect(value("Активные кампании")).toBe("2");
  expect(value("Занятость рекламного инвентаря, %")).toBe("18,8");
  for (const name of ["Запланированные показы", "Показы по журналу", "Оценочные контакты с аудиторией", "Взгляды на экран"]) {
    expect(value(name)).toMatch(/\d/);
  }
});

test("[f02-dashboard] planned and log shows are separate cards", () => {
  open();
  expect(card("Запланированные показы")).not.toBe(card("Показы по журналу"));
  expect(value("Запланированные показы")).toBe((5400).toLocaleString("ru-RU"));
  expect(value("Показы по журналу")).toBe((4200).toLocaleString("ru-RU"));
  expect(within(card("Запланированные показы")).queryByText("Демонстрационные данные")).toBeNull();
});

test("[f02-dashboard] simulated cards carry the demo label", () => {
  open();
  for (const name of ["Показы по журналу", "Оценочные контакты с аудиторией", "Взгляды на экран"]) {
    expect(within(card(name)).getByText("Демонстрационные данные")).toBeTruthy();
  }
  expect(screen.getAllByText("Демонстрационные данные")).toHaveLength(3);
});

test("[f02-dashboard] occupancy chart per day", () => {
  open();
  const table = screen.getByRole("table", { name: "Занятость по дням" });
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(7);
  expect(within(rows[0]).getByText("22.10.2026")).toBeTruthy();
  expect(within(rows[6]).getByText("16")).toBeTruthy();
});

test("[f02-dashboard] screens per city block", () => {
  open();
  const block = region("Экраны по городам");
  const counts = ["Астана", "Караганда", "Атырау", "Восточно-Казахстанская область"].map((city) =>
    Number(within(within(block).getByText(city).closest("tr")!).getAllByRole("cell")[1].textContent),
  );
  expect(counts).toEqual([40, 25, 20, 15]);
  expect(counts.reduce((a, b) => a + b)).toBe(100);
});

test("[f02-dashboard] active campaigns list", () => {
  open();
  const list = region("Активные кампании");
  expect(within(within(list).getByText("Летняя акция").closest("tr")!).getByText("Demo Cola")).toBeTruthy();
  expect(within(within(list).getByText("Открытие магазина").closest("tr")!).getByText("Demo Market")).toBeTruthy();
  expect(within(list).getByText("до 17.11.2026")).toBeTruthy();
  expect(within(list).queryByText("Презентация автомобиля")).toBeNull();
});

test("[f02-dashboard] city filter changes all values", async () => {
  open("/?screen=krg1");
  await pick("Город", "Астана");
  await waitFor(() => expect(url()).toContain("city=astana"));
  // A billboard of another city is cleared; the billboard picker lists only the city's screens.
  expect(url()).not.toContain("screen=");
  expect(lastSummaryArgs()).toMatchObject({ city: "astana" });
  expect(lastSummaryArgs().screenId).toBeUndefined();
  fireEvent.click(screen.getByRole("combobox", { name: "Билборд" }));
  expect(await screen.findByRole("option", { name: "AST-001 Есиль" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: "KRG-001 Центр" })).toBeNull();
});

test("[f02-dashboard] billboard filter changes all values", async () => {
  open();
  await pick("Билборд", "KRG-001 Центр");
  await waitFor(() => expect(url()).toContain("screen=krg1"));
  expect(lastSummaryArgs()).toMatchObject({ screenId: "krg1" });
  act(() => convex.set("dashboard:summary", { ...summary(WEEK), screens: { total: 1, online: 0, offline: 1 } }));
  expect(value("Экраны в сети")).toBe("1");
});

test("[f02-dashboard] period filter changes all values", async () => {
  open("/?from=2026-10-22&to=2026-10-28");
  expect(lastSummaryArgs()).toMatchObject({ from: "2026-10-22", to: "2026-10-28" });
  // Pick one day (28 October twice) in the «Период» picker.
  fireEvent.click(screen.getByRole("button", { name: "Период" }));
  for (let i = 0; i < 2; i++) {
    fireEvent.click(screen.getAllByRole("button", { name: /^28 / }).find((b) => !b.hasAttribute("data-outside"))!);
  }
  await waitFor(() => expect(url()).toContain("from=2026-10-28&to=2026-10-28"));
  expect(lastSummaryArgs()).toMatchObject({ from: "2026-10-28", to: "2026-10-28" });
  act(() => convex.set("dashboard:summary", summary(["2026-10-28"])));
  expect(within(screen.getByRole("table", { name: "Занятость по дням" })).getAllByRole("row")).toHaveLength(2);
});

test("[f02-dashboard] unknown billboard is refused", () => {
  convex.set("dashboard:summary", new ConvexError({ code: "NOT_FOUND", entity: "screen" }));
  open("/?screen=gone");
  expect(screen.getByRole("alert").textContent).toBe("Запись не найдена. Возможно, демо было сброшено.");
  // The filters stay usable so a stale URL can be fixed.
  expect(screen.getByRole("combobox", { name: "Билборд" })).toBeTruthy();
});

test("[f02-dashboard] offline screen notification", () => {
  convex.set("dashboard:notifications", [{ kind: "screen_offline", refId: "krg1", name: "KRG-001 Центр" }]);
  open("/?city=astana");
  const list = region("Уведомления");
  expect(within(list).getByText("Экран недоступен")).toBeTruthy();
  expect(within(list).getByText("KRG-001 Центр")).toBeTruthy();
  // Network-wide: the notifications query takes no filter.
  expect(convex.calls.find((c) => c.name === "dashboard:notifications")!.args).not.toHaveProperty("city");
});

test("[f02-dashboard] ending campaign notification", () => {
  convex.set("dashboard:notifications", [{ kind: "campaign_ending", refId: "c2", name: "Открытие магазина" }]);
  open();
  const list = region("Уведомления");
  expect(within(list).getByText("Кампания скоро завершится")).toBeTruthy();
  expect(within(list).getByText("Открытие магазина")).toBeTruthy();
});

test("[f02-dashboard] campaign ending later has no notification", () => {
  open();
  expect(within(region("Уведомления")).getByText("Нет уведомлений")).toBeTruthy();
});

test("loading regions are busy until data arrives", () => {
  convex.set("dashboard:summary", undefined);
  convex.set("dashboard:notifications", undefined);
  open();
  expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(2);
});
