import "dayjs/locale/ru";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Accordion, MantineProvider, mergeThemeOverrides } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ConvexError } from "convex/values";
import { theme } from "../theme";

// jsdom fires no transitionend, so the accordion opens without animation in tests.
const testTheme = mergeThemeOverrides(theme, { components: { Accordion: Accordion.extend({ defaultProps: { transitionDuration: 0 } }) } });
import { Schedule } from "./Schedule";

// Fake Convex: query results by function name (reactive like the real client) and the last args of each call.
const convex = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const queries: Record<string, unknown> = {};
  return {
    queries,
    args: {} as Record<string, unknown>,
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
      if (value instanceof Error) throw value;
      return value;
    },
    useMutation: () => vi.fn(),
  };
});

const OPTIONS = [
  { _id: "s1", code: "AST-001", name: "Экран на проспекте", city: "astana", status: "online" },
  { _id: "s2", code: "AST-002", name: "Экран у вокзала", city: "astana", status: "online" },
  { _id: "s3", code: "ATY-001", name: "Экран на набережной", city: "atyrau", status: "online" },
  { _id: "s4", code: "ATY-002", name: "Экран у рынка", city: "atyrau", status: "offline" },
];

const slots = (owners: Array<[string, string] | null>) =>
  Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    startSec: i * 5,
    endSec: (i + 1) * 5,
    campaignId: owners[i]?.[0] ?? null,
    campaignName: owners[i]?.[1] ?? null,
  }));
const SUMMER: [string, string] = ["c1", "Летняя акция"];
const DAY = {
  screen: { _id: "s1", code: "AST-001", name: "Экран на проспекте", city: "astana", status: "online", workStartHour: 9, workEndHour: 12 },
  date: "2026-10-30",
  hours: [
    { hour: 9, used: 0, slots: slots([]) },
    { hour: 10, used: 2, slots: slots([SUMMER, SUMMER]) },
    { hour: 11, used: 0, slots: slots([]) },
  ],
};

beforeEach(() => {
  for (const key of Object.keys(convex.args)) delete convex.args[key];
  convex.set("screens:options", OPTIONS);
  convex.set("schedule:day", DAY);
});
afterEach(() => vi.useRealTimers());

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="path">{pathname + search}</output>;
}

function open(path: string) {
  return render(
    <MantineProvider theme={testTheme} env="test">
      <DatesProvider settings={{ locale: "ru" }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/schedule" element={<Schedule />} />
            <Route path="*" element={null} />
          </Routes>
          <Where />
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>,
  );
}

const where = () => screen.getByTestId("path").textContent!;
const input = (label: string) => screen.getByRole("combobox", { name: label }) as HTMLInputElement;
function pick(label: string, option: string) {
  fireEvent.click(input(label));
  fireEvent.click(screen.getByRole("option", { name: option }));
}
function openHour(range: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(range) }));
}
const cells = () => Array.from(document.querySelectorAll<HTMLElement>('[data-state="occupied"], [data-state="free"]'));
const today = (iso: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
};

test("[f07-schedule] user selects city billboard and date", () => {
  today("2026-10-28T06:00:00Z");
  const first = open("/schedule");
  pick("Город", "Астана");
  pick("Билборд", "AST-001 Экран на проспекте");
  fireEvent.click(screen.getByRole("button", { name: /Дата/ }));
  const day30 = screen.getAllByRole("button", { name: /30/ }).find((b) => !b.hasAttribute("data-outside"))!;
  fireEvent.click(day30);
  expect(convex.args["schedule:day"]).toMatchObject({ screenId: "s1", date: "2026-10-30" });
  expect(screen.getByRole("button", { name: /10:00–11:00/ })).toBeTruthy();

  const url = where();
  expect(new URLSearchParams(url.split("?")[1]).toString()).toBe("city=astana&screen=s1&date=2026-10-30");
  first.unmount(); // page refresh: a new app on the same URL
  open(url);
  expect(input("Город").value).toBe("Астана");
  expect(input("Билборд").value).toBe("AST-001 Экран на проспекте");
  expect(screen.getByRole("button", { name: /Дата/ }).textContent).toContain("30.10.2026");
  expect(convex.args["schedule:day"]).toMatchObject({ screenId: "s1", date: "2026-10-30" });
});

test("[f07-schedule] city narrows the billboard picker", () => {
  open("/schedule?screen=s1");
  pick("Город", "Атырау");
  expect(where()).not.toContain("screen=s1"); // the Astana screen is cleared
  fireEvent.click(input("Билборд"));
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["ATY-001 Экран на набережной", "ATY-002 Экран у рынка"]);
});

test("[f07-schedule] date defaults to today", () => {
  today("2026-10-28T20:00:00Z"); // 01:00 on 29 October in UTC+5
  open("/schedule?screen=s1");
  expect(screen.getByRole("button", { name: /Дата/ }).textContent).toContain("29.10.2026");
  expect(convex.args["schedule:day"]).toMatchObject({ date: "2026-10-29" });
});

test("[f07-schedule] no billboard selected", () => {
  open("/schedule?city=astana");
  expect(screen.getByText("Выберите билборд, чтобы увидеть расписание")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /\d\d:00–\d\d:00/ })).toBeNull();
  expect(convex.args["schedule:day"]).toBeUndefined(); // schedule.day is not called
});

test("[f07-schedule] schedule lists the working hours", () => {
  open("/schedule?screen=s1&date=2026-10-30");
  const hours = screen.getAllByRole("button", { name: /\d\d:00–\d\d:00/ }).map((b) => b.textContent);
  expect(hours).toEqual(["09:00–10:00Занято 0 из 12", "10:00–11:00Занято 2 из 12", "11:00–12:00Занято 0 из 12"]);
});

test("[f07-schedule] opening an hour shows 12 slots", () => {
  open("/schedule?screen=s1&date=2026-10-30");
  expect(cells()).toHaveLength(0);
  openHour("10:00–11:00");
  expect(cells()).toHaveLength(12);
  expect(cells()[0].textContent).toContain("00–05 сек.");
  expect(cells()[11].textContent).toContain("55–60 сек.");
});

test("[f07-schedule] slots show time and campaign or Свободно", () => {
  open("/schedule?screen=s1&date=2026-10-30");
  openHour("10:00–11:00");
  const all = cells();
  expect(all.slice(0, 2).map((c) => c.textContent)).toEqual(["00–05 сек.Летняя акция", "05–10 сек.Летняя акция"]);
  expect(all[2].textContent).toBe("10–15 сек.Свободно");
  expect(all.slice(2).every((c) => c.textContent!.endsWith("Свободно"))).toBe(true);
});

test("[f07-schedule] occupied and free slots look different", () => {
  open("/schedule?screen=s1&date=2026-10-30");
  openHour("10:00–11:00");
  const occupied = cells().filter((c) => c.dataset.state === "occupied");
  const free = cells().filter((c) => c.dataset.state === "free");
  expect([occupied.length, free.length]).toEqual([2, 10]);
  for (const c of occupied) {
    expect(within(c).getByRole("link", { name: "Летняя акция" })).toBeTruthy();
    expect(c.style.background).not.toBe("");
    expect(c.hasAttribute("data-with-border")).toBe(false);
  }
  for (const c of free) {
    expect(within(c).queryByRole("link")).toBeNull();
    expect(c.textContent).toContain("Свободно");
    expect(c.hasAttribute("data-with-border")).toBe(true);
  }
});

test("[f07-schedule] campaign name links to the campaign card", () => {
  open("/schedule?screen=s1&date=2026-10-30");
  openHour("10:00–11:00");
  fireEvent.click(within(cells()[0]).getByRole("link", { name: "Летняя акция" }));
  expect(where()).toBe("/campaigns/c1");
});

test("[f07-schedule] unknown screen is refused", () => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the caught render error
  convex.set("schedule:day", new ConvexError({ code: "NOT_FOUND", entity: "screens" }));
  open("/schedule?screen=gone&date=2026-10-30");
  expect(screen.getByRole("alert").textContent).toBe("Запись не найдена. Возможно, демо было сброшено.");
  convex.set("schedule:day", DAY);
  pick("Билборд", "AST-001 Экран на проспекте");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: /10:00–11:00/ })).toBeTruthy();
});

test("[f07-schedule] campaign opened from its card is marked and its first hour opens", () => {
  const view = open("/schedule?screen=s1&date=2026-10-30&campaign=c1");
  // 10:00–11:00 holds c1 and opens on its own; its 2 slots are marked
  expect(cells()).toHaveLength(12);
  const marked = cells().filter((c) => c.dataset.marked !== undefined);
  expect(marked).toHaveLength(2);
  for (const c of marked) expect(within(c).getByRole("link", { name: "Летняя акция" })).toBeTruthy();
  view.unmount();
  open("/schedule?screen=s1&date=2026-10-30");
  expect(cells()).toHaveLength(0); // no campaign param: every hour starts closed
});
