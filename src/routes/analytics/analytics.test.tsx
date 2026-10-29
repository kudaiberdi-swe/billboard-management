// «Аналитика аудитории» UI scenarios (f08-audience-analytics). The backend values are covered by
// convex/analytics.test.ts; here a fake Convex returns fixed values and records the args the page sends.
import "dayjs/locale/ru";
import { beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ConvexError } from "convex/values";
import { addDays, kzNow } from "../../../convex/lib/time";
import { convex } from "../../test/fakeConvex";
import { theme } from "../../theme";
import { Analytics } from "../Analytics";

vi.mock("convex/react", () => import("../../test/fakeConvex"));

const OPTIONS = [
  { _id: "s1", code: "AST-001", name: "AST-001 Есиль", city: "astana", status: "online" },
  { _id: "s2", code: "AST-002", name: "AST-002 Центр", city: "astana", status: "online" },
  { _id: "s3", code: "KRG-001", name: "KRG-001 Центр", city: "karaganda", status: "online" },
];

const byHour = Array.from({ length: 24 }, (_, hour) => {
  const on = hour >= 7 && hour < 23;
  return { hour, people: on ? 100 * hour : 0, looks: on ? 10 * hour : 0 };
});

const SCREENS: Record<string, { hasCamera: boolean; hasVehicleMetric: boolean }> = {
  s1: { hasCamera: true, hasVehicleMetric: true },
  s2: { hasCamera: true, hasVehicleMetric: false },
  s3: { hasCamera: false, hasVehicleMetric: false },
};

function result({ screenId }: { screenId: string }) {
  const o = OPTIONS.find((s) => s._id === screenId)!;
  const flags = SCREENS[screenId];
  return {
    screen: { _id: o._id, code: o.code, name: o.name, city: o.city, ...flags },
    audience: flags.hasCamera
      ? {
          people: 12345,
          gazeEstimated: 8000,
          looks: 3000,
          vehicles: flags.hasVehicleMetric ? 6789 : null,
          lookShare: 37.5,
          byHour,
          profile: {
            age: [
              { group: "18-24", share: 18 },
              { group: "25-34", share: 31 },
              { group: "35-44", share: 24 },
              { group: "45-54", share: 15 },
              { group: "55+", share: 12 },
            ],
            gender: { male: 52, female: 48 },
          },
        }
      : null,
  };
}

beforeEach(() => {
  convex.reset();
  convex.set("screens:options", OPTIONS);
  convex.set("analytics:screenPeriod", result);
});

function Where() {
  const { search } = useLocation();
  return <output data-testid="url">{search}</output>;
}

function open(path = "/analytics") {
  render(
    <MantineProvider theme={theme} env="test">
      <DatesProvider settings={{ locale: "ru" }}>
        <MemoryRouter initialEntries={[path]}>
          <Analytics />
          <Where />
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>,
  );
}

const card = (name: string) => screen.getByRole("group", { name });
const value = (name: string) => within(card(name)).getAllByText(/\d/)[0].textContent;
const region = (name: string) => screen.getByRole("region", { name });
const lastArgs = () => (convex.calls["analytics:screenPeriod"] ?? []).at(-1) as Record<string, unknown>;
const DEMO = "Демонстрационные данные";
const n = (x: number) => x.toLocaleString("ru-RU");

test("[f08-audience-analytics] screen period values", () => {
  open();
  const today = kzNow(Date.now()).date;
  // defaults: the first billboard of the picker and the 7 days ending today (UTC+5)
  expect(lastArgs()).toMatchObject({ screenId: "s1", from: addDays(today, -6), to: today });
  expect(value("Трафик: люди в зоне наблюдения")).toBe(n(12345));
  expect(value("Взгляды на экран")).toBe(n(3000));
});

test("[f08-audience-analytics] pickers are bound to the URL", async () => {
  open("/analytics?from=2026-10-01&to=2026-10-03");
  expect(lastArgs()).toMatchObject({ screenId: "s1", from: "2026-10-01", to: "2026-10-03" });
  fireEvent.click(screen.getByRole("combobox", { name: "Билборд" }));
  fireEvent.click(await screen.findByRole("option", { name: "AST-002 Центр" }));
  expect(screen.getByTestId("url").textContent).toContain("screen=s2");
  expect(lastArgs()).toMatchObject({ screenId: "s2", from: "2026-10-01", to: "2026-10-03" });
});

test("[f08-audience-analytics] look share among gaze", () => {
  open();
  expect(value("Доля взглядов среди людей с оценённым направлением взгляда")).toBe("37,5\u00a0%");
  act(() =>
    convex.set("analytics:screenPeriod", (args: { screenId: string }) => {
      const r = result(args);
      return { ...r, audience: { ...r.audience!, gazeEstimated: 0, looks: 0, lookShare: 0 } };
    }),
  );
  expect(value("Доля взглядов среди людей с оценённым направлением взгляда")).toBe("0,0\u00a0%");
});

test("[f08-audience-analytics] unknown billboard is refused", () => {
  convex.set("analytics:screenPeriod", new ConvexError({ code: "NOT_FOUND", entity: "screen" }));
  open("/analytics?screen=gone");
  expect(screen.getByRole("alert").textContent).toBe("Запись не найдена. Возможно, демо было сброшено.");
  // the pickers stay usable
  expect(screen.getByRole("combobox", { name: "Билборд" })).toBeTruthy();
});

test("[f08-audience-analytics] no session is refused", () => {
  convex.set("analytics:screenPeriod", new ConvexError({ code: "UNAUTHENTICATED" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  // UNAUTHENTICATED is not shown in place: it goes on to the app gate (password screen)
  expect(() => open()).toThrow();
});

test("[f08-audience-analytics] vehicles only where measured", async () => {
  open("/analytics?screen=s1");
  expect(value("Трафик: транспорт")).toBe(n(6789));
  fireEvent.click(screen.getByRole("combobox", { name: "Билборд" }));
  fireEvent.click(await screen.findByRole("option", { name: "AST-002 Центр" }));
  expect(value("Трафик: люди в зоне наблюдения")).toBe(n(12345));
  expect(screen.queryByRole("group", { name: "Трафик: транспорт" })).toBeNull();
});

const screenWithoutACamera = () => {
  open("/analytics?screen=s3");
  // empty state: a title and a sentence that names the screen and says «нет камеры»
  expect(screen.getByRole("heading", { name: "Камеры нет" })).toBeTruthy();
  expect(screen.getByText(/нет камеры, поэтому аналитика аудитории недоступна/).textContent).toBe(
    "На экране KRG-001 Центр нет камеры, поэтому аналитика аудитории недоступна. Выберите экран с камерой.",
  );
  expect(screen.queryAllByRole("group")).toHaveLength(0);
  expect(screen.queryByRole("region", { name: "Аудитория и взгляды по часам" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Возраст (предположительно)" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Пол (предположительно)" })).toBeNull();
  expect(screen.queryByText(DEMO)).toBeNull();
};
test("[f08-audience-analytics] screen without a camera", screenWithoutACamera);
test("[c00-predeploy-hardening] screen without a camera", screenWithoutACamera);

test("[f08-audience-analytics] age groups and gender", () => {
  open();
  const age = region("Возраст (предположительно)");
  const ageRows = within(age).getAllByRole("row");
  expect(ageRows.map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual(["18–24", "25–34", "35–44", "45–54", "55+"]);
  const percents = ageRows.map((r) => parseInt(within(r).getAllByRole("cell")[2].textContent!, 10));
  expect(percents.reduce((a, b) => a + b, 0)).toBe(100);
  const gender = region("Пол (предположительно)");
  expect(within(gender).getByRole("heading").textContent).toContain("предположительно");
  const g = within(gender).getAllByRole("row").map((r) => parseInt(within(r).getAllByRole("cell")[2].textContent!, 10));
  expect(g).toEqual([52, 48]);
});

test("[f08-audience-analytics] estimate note on age and gender", () => {
  open();
  for (const name of ["Возраст (предположительно)", "Пол (предположительно)"]) {
    expect(within(region(name)).getByText("Возраст и пол — оценка алгоритма, не точные данные.")).toBeTruthy();
  }
});

test("[f08-audience-analytics] audience and looks per hour", () => {
  open();
  const table = within(region("Аудитория и взгляды по часам")).getByRole("table", { hidden: true });
  const rows = within(table).getAllByRole("row", { hidden: true }).slice(1);
  expect(rows).toHaveLength(24);
  expect(within(rows[0]).getAllByRole("cell", { hidden: true }).map((c) => c.textContent)).toEqual(["00:00", "0", "0"]);
  expect(within(rows[8]).getAllByRole("cell", { hidden: true }).map((c) => c.textContent)).toEqual(["08:00", n(800), n(80)]);
  expect(within(rows[23]).getAllByRole("cell", { hidden: true }).map((c) => c.textContent)).toEqual(["23:00", "0", "0"]);
});

test("[f08-audience-analytics] glossary terms are used", () => {
  open();
  expect(within(card("Трафик: люди в зоне наблюдения")).getByText(/^Трафик/).textContent!.toLowerCase()).toContain("трафик");
  // «Взгляды на экран» is the plural of the term «взгляд на экран»
  expect(within(card("Взгляды на экран")).getByText(/^Взгляд/)).toBeTruthy();
  const terms = within(region("Термины"));
  for (const term of ["трафик", "взгляд на экран", "показ рекламы", "контакт с кампанией"]) {
    expect(terms.getByText(term).tagName).toBe("DT");
  }
  // the screen audience is never labelled as a show or a campaign contact
  for (const group of screen.getAllByRole("group")) {
    expect(group.textContent).not.toMatch(/показ рекламы|контакт с кампанией/i);
  }
});

test("[f08-audience-analytics] no personal data", () => {
  for (const id of ["s1", "s3"]) {
    open(`/analytics?screen=${id}`);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(document.querySelectorAll("img, picture, video")).toHaveLength(0);
    cleanup();
  }
});

test("[f08-audience-analytics] all values carry the demo label", () => {
  open();
  for (const name of ["Трафик: люди в зоне наблюдения", "Трафик: транспорт", "Взгляды на экран", "Доля взглядов среди людей с оценённым направлением взгляда"]) {
    expect(within(card(name)).getByText(DEMO)).toBeTruthy();
  }
  for (const name of ["Аудитория и взгляды по часам", "Возраст (предположительно)", "Пол (предположительно)"]) {
    expect(within(region(name)).getByText(DEMO)).toBeTruthy();
  }
});
