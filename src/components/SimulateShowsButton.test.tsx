// f10-simulate-shows: the simulate button on the campaign card, with a mocked showLog.simulate.
import { beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConvexError } from "convex/values";
import { convex } from "../test/fakeConvex";
import { theme } from "../theme";
import { CampaignCard } from "../routes/campaigns/CampaignCard";

vi.mock("convex/react", () => import("../test/fakeConvex"));

const CARD = {
  _id: "c1",
  name: "Летняя акция",
  advertiser: "Demo Cola",
  startDate: "2026-10-18",
  endDate: "2026-11-17",
  status: "active",
  cities: ["astana"],
  plannedShows: 25200,
  logShows: 0,
  startHour: 8,
  endHour: 22,
  slotsPerCycle: 2,
  creative: { kind: "placeholder", key: "placeholder-1" },
  screens: [{ _id: "s1", code: "AST-001", name: "AST-001 Центр", city: "astana", status: "online", plannedShows: 25200, logShows: 0 }],
};

beforeEach(() => {
  convex.reset();
  convex.set("campaigns:get", CARD);
});

function open() {
  render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={["/campaigns/c1"]}>
        <Routes>
          <Route path="/campaigns/:id" element={<CampaignCard />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

const button = () => screen.getByRole("button", { name: "Смоделировать показы" });

test("[f10-simulate-shows] card has the simulate button", () => {
  for (const status of ["planned", "active", "finished"]) {
    convex.set("campaigns:get", { ...CARD, status });
    open();
    expect(button()).toBeTruthy();
    cleanup();
  }
});

test("[f10-simulate-shows] button shows the result", async () => {
  let resolve!: (v: unknown) => void;
  const simulate = vi.fn(() => new Promise((r) => (resolve = r)));
  convex.mutations["showLog:simulate"] = simulate;
  open();
  fireEvent.click(button());
  await waitFor(() => expect(button().hasAttribute("disabled")).toBe(true));
  expect(simulate).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "c1" }));
  resolve({ rows: 30, from: "2026-10-18", to: "2026-10-28" });
  expect((await screen.findByRole("status")).textContent).toBe("Показы смоделированы: 18.10.2026 – 28.10.2026");
  expect(button().hasAttribute("disabled")).toBe(false);
});

const notStartedCampaignIsRefused = async () => {
  convex.set("campaigns:get", { ...CARD, status: "planned", name: "Презентация автомобиля" });
  convex.mutations["showLog:simulate"] = vi.fn().mockRejectedValue(new ConvexError({ code: "CAMPAIGN_NOT_STARTED" }));
  open();
  fireEvent.click(button());
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Кампания ещё не началась. Показы по журналу появятся после даты начала.",
  );
  expect(screen.queryByRole("status")).toBeNull();
};
test("[f10-simulate-shows] not started campaign is refused", notStartedCampaignIsRefused);
test("[c00-predeploy-hardening] not started campaign is refused", notStartedCampaignIsRefused);

test("[c00-predeploy-hardening] full log shows the log full message", async () => {
  convex.mutations["showLog:simulate"] = vi.fn().mockRejectedValue(new ConvexError({ code: "INVALID_INPUT", field: "campaignId" }));
  open();
  fireEvent.click(button());
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Журнал показов заполнен. Сбросьте демо, чтобы смоделировать показы снова.",
  );
  expect(screen.queryByText("Проверьте поле: campaignId.")).toBeNull();
  expect(button().hasAttribute("disabled")).toBe(false);
});

test("[c00-predeploy-hardening] not started note turns the button off", async () => {
  convex.set("campaigns:get", { ...CARD, status: "planned", name: "Презентация автомобиля" });
  convex.mutations["showLog:simulate"] = vi.fn().mockRejectedValue(new ConvexError({ code: "CAMPAIGN_NOT_STARTED" }));
  open();
  fireEvent.click(button());
  const note = await screen.findByRole("alert");
  // Mantine puts the alert colour in its CSS variables: grey, not red
  expect(note.getAttribute("style")).toContain("gray");
  expect(note.getAttribute("style")).not.toContain("red");
  expect(button().hasAttribute("disabled")).toBe(true);
});
