import { useSyncExternalStore } from "react";
import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ConvexError } from "convex/values";
import { theme } from "../../theme";
import { Campaigns } from "../Campaigns";
import { CampaignCard } from "./CampaignCard";

// Fake Convex: query results by function name (as in src/shell/shell.test.tsx).
const convex = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const queries: Record<string, unknown> = {};
  return {
    queries,
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
    useQuery: (ref: never) => {
      const value = useSyncExternalStore(convex.subscribe, () => convex.queries[getFunctionName(ref)]);
      if (value instanceof Error) throw value;
      return value;
    },
    useMutation: () => vi.fn(),
  };
});

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function open(path: string) {
  render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignCard />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const ROW = {
  _id: "c1",
  name: "Летняя акция",
  advertiser: "Demo Cola",
  startDate: "2026-10-18",
  endDate: "2026-11-17",
  status: "active",
  cities: ["astana", "karaganda"],
  screenCount: 2,
  plannedShows: 50400,
  logShows: 1234,
};
const CARD = {
  ...ROW,
  startHour: 8,
  endHour: 22,
  slotsPerCycle: 2,
  creative: { kind: "placeholder", key: "placeholder-1" },
  screens: [
    { _id: "s1", code: "AST-001", name: "AST-001 Центр", city: "astana", status: "online", plannedShows: 25200, logShows: 1234 },
    { _id: "s2", code: "KRG-001", name: "KRG-001 Центр", city: "karaganda", status: "offline", plannedShows: 25200, logShows: 0 },
  ],
};

test("[f05-campaign-list] empty list shows a message", () => {
  convex.set("campaigns:list", []);
  open("/campaigns");
  expect(screen.getByText("Кампаний пока нет")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
});

test("[f05-campaign-list] row name opens the card", () => {
  convex.set("campaigns:list", [ROW]);
  convex.set("campaigns:get", CARD);
  open("/campaigns");
  const row = screen.getByRole("link", { name: "Летняя акция" }).closest("tr")!;
  for (const text of ["Demo Cola", "18.10.2026 – 17.11.2026", "Астана, Караганда", "Активна"]) {
    expect(row.textContent).toContain(text);
  }
  fireEvent.click(screen.getByRole("link", { name: "Летняя акция" }));
  expect(screen.getByTestId("path").textContent).toBe("/campaigns/c1");
});

test("[f05-campaign-list] list carries the demo label", () => {
  convex.set("campaigns:list", [ROW]);
  open("/campaigns");
  expect(screen.getByText("Демонстрационные данные")).toBeTruthy();
});

test("[f05-campaign-list] card shows campaign details", () => {
  convex.set("campaigns:get", CARD);
  open("/campaigns/c1");
  expect(screen.getByRole("heading", { level: 1, name: "Летняя акция" })).toBeTruthy();
  for (const text of ["Demo Cola", "18.10.2026 – 17.11.2026", "08:00–22:00", "2", "Активна", "Астана, Караганда", "офлайн"]) {
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  }
  expect(screen.getByRole("img", { name: "Креатив" }).getAttribute("src")).toBe("/demo/creatives/placeholder-1.svg");
  expect(screen.getByRole("table").textContent).toContain("KRG-001");
  expect(screen.getByText("Демонстрационные данные")).toBeTruthy();
});

test("[f05-campaign-list] card of a deleted campaign", () => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the caught render error
  convex.set("campaigns:get", new ConvexError({ code: "NOT_FOUND", entity: "campaign" }));
  open("/campaigns/stale");
  expect(screen.getByRole("alert").textContent).toBe("Запись не найдена. Возможно, демо было сброшено.");
  convex.set("campaigns:list", []);
  fireEvent.click(screen.getByRole("link", { name: "К списку кампаний" }));
  expect(screen.getByTestId("path").textContent).toBe("/campaigns");
});
