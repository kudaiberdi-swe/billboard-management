// «Отчёты» UI scenarios (f09-reports). The backend values are covered by convex/reports.test.ts;
// here a fake Convex returns fixed values and records the args the page sends.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ConvexError } from "convex/values";
import "dayjs/locale/ru";
import { leaves } from "../../../shared/strings";
import { ru } from "../../../shared/strings/ru";
import { theme } from "../../theme";
import { Reports } from "../Reports";

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

const DISCLAIMER = "Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват";
const AST1 = { _id: "ast1", code: "AST-001", name: "AST-001 Центр", city: "astana" };
const KRG1 = { _id: "krg1", code: "KRG-001", name: "KRG-001 Север", city: "karaganda" };

const report = (completion: number | null = 90) => ({
  campaign: { _id: "c1", name: "Летняя акция", advertiser: "Demo Cola", startDate: "2026-10-21", endDate: "2026-10-22", status: "active" },
  period: { from: "2026-10-21", to: "2026-10-22" },
  options: { cities: ["astana", "karaganda"], screens: [AST1, KRG1] },
  cities: ["astana", "karaganda"],
  screens: [AST1, KRG1],
  placement: {
    plannedShows: 1440,
    logShows: 1296,
    completion,
    byDay: [
      { date: "2026-10-21", planned: 720, log: 648 },
      { date: "2026-10-22", planned: 720, log: 648 },
    ],
    byScreen: [
      { ...AST1, planned: 720, log: 648, completion },
      { ...KRG1, planned: 720, log: 648, completion },
    ],
  },
  screenAnalytics: { traffic: 85000, looks: 24000, contacts: 4000, screensWithoutCamera: 1 },
});

beforeEach(() => {
  convex.calls.length = 0;
  convex.set("reports:campaign", report());
  convex.set("campaigns:list", [{ _id: "c1", name: "Летняя акция" }, { _id: "c2", name: "Открытие магазина" }]);
});
afterEach(() => vi.restoreAllMocks());

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="url">{pathname + search}</output>;
}

function open(path = "/reports?campaign=c1") {
  render(
    <MantineProvider theme={theme} env="test">
      <DatesProvider settings={{ locale: "ru" }}>
        <MemoryRouter initialEntries={[path]}>
          <Reports />
          <Where />
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>,
  );
}

const region = (name: string) => screen.getByRole("region", { name });
const value = (name: string) => within(screen.getByRole("group", { name })).getAllByText(/\d|—/)[0].textContent;
const lastReportArgs = () => convex.calls.filter((c) => c.name === "reports:campaign").at(-1)!.args;
const url = () => screen.getByTestId("url").textContent!;

test("[f09-reports] filters live in the URL", async () => {
  open("/reports?campaign=c1&city=karaganda");
  expect(lastReportArgs()).toMatchObject({ campaignId: "c1", city: "karaganda" });
  expect(lastReportArgs()).not.toHaveProperty("screenId");
  expect(screen.getByRole("combobox", { name: "Город" })).toHaveProperty("value", "Караганда");
  // a picked billboard goes into the URL and the query
  fireEvent.click(screen.getByRole("combobox", { name: "Билборд" }));
  fireEvent.click(await screen.findByRole("option", { name: "KRG-001 Север" }));
  expect(url()).toBe("/reports?campaign=c1&city=karaganda&screen=krg1");
  expect(lastReportArgs()).toMatchObject({ campaignId: "c1", city: "karaganda", screenId: "krg1" });
  // another campaign drops the filters of the old one
  fireEvent.click(screen.getByRole("combobox", { name: "Кампания" }));
  fireEvent.click(await screen.findByRole("option", { name: "Открытие магазина" }));
  expect(url()).toBe("/reports?campaign=c2");
});

test("[f09-reports] no campaign selected", () => {
  open("/reports");
  expect(screen.getByRole("combobox", { name: "Кампания" })).toBeTruthy();
  expect(screen.getAllByText("Выберите кампанию").length).toBeGreaterThan(0);
  expect(screen.queryByRole("region", { name: "Результаты размещения" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Аналитика экранов" })).toBeNull();
  expect(convex.calls.some((c) => c.name === "reports:campaign")).toBe(false);
});

test("[f09-reports] report has two separate blocks", () => {
  open();
  const placement = region("Результаты размещения");
  const analytics = region("Аналитика экранов");
  for (const label of ["Запланированные показы", "Показы по журналу", "Процент выполнения плана"]) {
    expect(within(placement).getAllByText(label).length).toBeGreaterThan(0);
    expect(within(analytics).queryByText(label)).toBeNull();
  }
  for (const label of ["Трафик у экранов за период", "Взгляды на экран", "Оценочные контакты с кампанией"]) {
    expect(within(analytics).getByText(label)).toBeTruthy();
    expect(within(placement).queryByText(label)).toBeNull();
  }
  expect(placement.contains(analytics)).toBe(false);
  expect(value("Запланированные показы")).toBe("1 440");
  expect(value("Процент выполнения плана")).toBe("90,0\u00a0%");
  expect(value("Трафик у экранов за период")).toBe("85 000");
  expect(within(analytics).getByText("1 экран — нет камеры, в аналитике экранов не учтены")).toBeTruthy();
  // header: campaign, advertiser, period, cities, screens (count per city)
  expect(screen.getByRole("heading", { name: "Летняя акция" })).toBeTruthy();
  for (const text of ["Demo Cola", "21.10.2026 – 22.10.2026", "Астана, Караганда", "2 экрана: Астана — 1, Караганда — 1"]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
});

test("[f09-reports] report shows the demo disclaimer", () => {
  open();
  const disclaimer = screen.getByText(DISCLAIMER);
  // the demo label sits on the simulated values; the disclaimer banner carries the sentence alone
  expect(screen.getAllByText("Демонстрационные данные").length).toBeGreaterThan(0);
  for (const name of ["Результаты размещения", "Аналитика экранов"]) {
    expect(disclaimer.compareDocumentPosition(region(name)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  expect(disclaimer.closest(".no-print")).toBeNull();
});

test("[f09-reports] zero plan shows a dash", () => {
  convex.set("reports:campaign", report(null));
  open();
  expect(value("Процент выполнения плана")).toBe("—");
  // the per-screen table follows its caption; plain DOM queries keep this cheap next to the chart markup
  const table = screen.getByText("Распределение по экранам").nextElementSibling!;
  const cells = [...table.querySelectorAll("tbody tr td:last-child")].map((td) => td.textContent);
  expect(cells).toEqual(["—", "—"]);
});

test("[f09-reports] report of a deleted campaign", () => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the caught render error
  convex.set("reports:campaign", new ConvexError({ code: "NOT_FOUND", entity: "campaign" }));
  open();
  expect(screen.getByRole("alert").textContent).toBe("Запись не найдена. Возможно, демо было сброшено.");
  expect(screen.getByRole("combobox", { name: "Кампания" })).toBeTruthy(); // another campaign can be picked
});

test("[f09-reports] print button opens the print dialog", () => {
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  open();
  fireEvent.click(screen.getByRole("button", { name: "Печать / сохранить в PDF" }));
  expect(print).toHaveBeenCalledTimes(1);
});

test("[f09-reports] print view hides menu and filters", () => {
  open();
  for (const name of ["Кампания", "Период", "Город", "Билборд"]) {
    expect(screen.getByText(name, { selector: "label" }).closest(".no-print")).not.toBeNull();
  }
  expect(screen.getByRole("button", { name: "Печать / сохранить в PDF" }).closest(".no-print")).not.toBeNull();
  for (const name of ["Результаты размещения", "Аналитика экранов"]) {
    expect(region(name).closest(".no-print")).toBeNull();
    expect(region(name).classList.contains("report-block")).toBe(true);
  }
  expect(screen.getByText(DISCLAIMER).closest(".no-print")).toBeNull();
  // the menu is hidden by the shell; the print rules hide every .no-print element
  const src = join(import.meta.dirname, "../..");
  expect(readFileSync(join(src, "shell/AppShell.tsx"), "utf8")).toMatch(/Navbar className="no-print"/);
  const css = readFileSync(join(src, "print.css"), "utf8").replace(/\s+/g, " ");
  expect(css).toMatch(/@media print \{ \.no-print \{ display: none !important; \}/);
  expect(css).toMatch(/@page \{ size: A4 portrait;/);
  expect(css).toMatch(/\.report-block \{ break-inside: avoid; \}/);
});

test("[f09-reports] no label claims a confirmed audience", () => {
  const offenders = leaves(ru.reports, "reports").filter(
    ([key, text]) => key !== "reports.disclaimer" && /подтвержд|охват/i.test(text),
  );
  expect(offenders).toEqual([]);
  expect(ru.reports.disclaimer).toBe(DISCLAIMER);
});
