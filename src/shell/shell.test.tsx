import { useSyncExternalStore } from "react";
import { beforeEach, expect, test, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ConvexError } from "convex/values";
import { DemoLabel } from "../components/DemoLabel";
import { theme } from "../theme";
import { Gate } from "./Gate";

// Fake Convex: query results by function name (reactive like the real client), mutations as mocks.
const convex = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const queries: Record<string, unknown> = {};
  return {
    queries,
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
      if (args === "skip") return undefined;
      if (value instanceof Error) throw value;
      return value;
    },
    useMutation: (ref: never) => (args: unknown) => convex.mutations[getFunctionName(ref)](args),
  };
});

beforeEach(() => {
  convex.set("demo:sessionStatus", { valid: true });
  convex.mutations["demo:signIn"] = vi.fn();
  convex.mutations["demo:reset"] = vi.fn().mockResolvedValue(null);
});

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function open(path: string) {
  render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Gate />
        <Where />
      </MemoryRouter>
    </MantineProvider>,
  );
}

const path = () => screen.getByTestId("path").textContent;
const menu = () => screen.queryByRole("navigation");
const sections = ["Главная", "Билборды", "Рекламные кампании", "Расписание", "Аналитика аудитории", "Отчёты"];

async function signInWith(password: string) {
  fireEvent.change(screen.getByLabelText("Пароль", { exact: false }), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Войти" }));
}

test("[base-contract] visitor without a session sees only the password screen", () => {
  convex.set("demo:sessionStatus", { valid: false });
  open("/campaigns");
  expect(path()).toBe("/login");
  expect(screen.getByLabelText("Пароль", { exact: false })).toBeTruthy();
  expect(menu()).toBeNull();
  expect(screen.queryByText("Рекламные кампании")).toBeNull();
});

test("[base-contract] correct password opens Главная", async () => {
  convex.set("demo:sessionStatus", { valid: false });
  convex.mutations["demo:signIn"].mockImplementation(async () => {
    convex.set("demo:sessionStatus", { valid: true });
    return { ok: true };
  });
  open("/login");
  await signInWith("secret");
  expect(await screen.findByRole("heading", { level: 1, name: "Главная" })).toBeTruthy();
  expect(path()).toBe("/");
  expect(menu()).toBeTruthy();
  expect(convex.mutations["demo:signIn"]).toHaveBeenCalledWith({ password: "secret", sessionId: expect.any(String) });
});

test("[base-contract] wrong password shows an error", async () => {
  convex.set("demo:sessionStatus", { valid: false });
  convex.mutations["demo:signIn"].mockResolvedValue({ ok: false, code: "WRONG_PASSWORD" });
  open("/login");
  await signInWith("wrong");
  expect(await screen.findByText("Неверный пароль.")).toBeTruthy();
  expect(path()).toBe("/login");
  expect(menu()).toBeNull();
});

test("[base-contract] too many sign-in attempts", async () => {
  convex.set("demo:sessionStatus", { valid: false });
  convex.mutations["demo:signIn"].mockRejectedValue(
    new ConvexError({ kind: "RateLimited", name: "signInPerAccount", retryAfter: 9 * 60_000 + 1 }),
  );
  open("/login");
  await signInWith("secret");
  expect(await screen.findByText("Слишком много попыток. Повторите через 10 мин.")).toBeTruthy();
  expect(menu()).toBeNull();
});

test("[base-contract] expired session returns to the password screen", async () => {
  convex.mutations["demo:reset"].mockRejectedValue(new ConvexError({ code: "UNAUTHENTICATED" }));
  open("/billboards");
  fireEvent.click(screen.getByRole("button", { name: "Сбросить демо" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Сбросить демо" }));
  expect(await screen.findByLabelText("Пароль", { exact: false })).toBeTruthy();
  expect(path()).toBe("/login");
  expect(menu()).toBeNull();
});

test("[base-contract] menu shows the 6 sections in order", () => {
  open("/");
  const links = within(screen.getByRole("navigation")).getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual(sections);
  expect(within(screen.getByRole("navigation")).getByText("BillBoard")).toBeTruthy();
});

test("[base-contract] menu item opens its section", () => {
  open("/");
  const routes = ["/", "/billboards", "/campaigns", "/schedule", "/analytics", "/reports"];
  sections.forEach((label, i) => {
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("link", { name: label }));
    expect(path()).toBe(routes[i]);
    expect(screen.getByRole("heading", { level: 1, name: label })).toBeTruthy();
    const current = within(screen.getByRole("navigation"))
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([label]);
  });
});

test("[base-contract] unknown route", () => {
  open("/unknown");
  expect(path()).toBe("/");
  expect(screen.getByRole("heading", { level: 1, name: "Главная" })).toBeTruthy();
});

test("[base-contract] reset asks for confirmation", async () => {
  open("/");
  fireEvent.click(screen.getByRole("button", { name: "Сбросить демо" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Сбросить демо?")).toBeTruthy();
  expect(convex.mutations["demo:reset"]).not.toHaveBeenCalled();
});

test("[base-contract] reset cancelled", async () => {
  open("/");
  fireEvent.click(screen.getByRole("button", { name: "Сбросить демо" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Отмена" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(convex.mutations["demo:reset"]).not.toHaveBeenCalled();
});

test("[base-contract] reset confirmed", async () => {
  open("/campaigns");
  fireEvent.click(screen.getByRole("button", { name: "Сбросить демо" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Сбросить демо" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(convex.mutations["demo:reset"]).toHaveBeenCalledWith({ sessionId: expect.any(String) });
  expect(path()).toBe("/");
  expect(screen.getByRole("heading", { level: 1, name: "Главная" })).toBeTruthy();
});

test("[base-contract] sign-out forgets the session and returns to the password screen", async () => {
  open("/campaigns");
  const before = localStorage.getItem("billboard.sessionId");
  expect(before).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Выйти" }));
  expect(await screen.findByLabelText("Пароль", { exact: false })).toBeTruthy();
  expect(path()).toBe("/login");
  expect(menu()).toBeNull();
  expect(localStorage.getItem("billboard.sessionId")).not.toBe(before);
});

test("[predeploy] a failed session check offers a retry instead of a blank page", async () => {
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the caught render error
  convex.set("demo:sessionStatus", new Error("timeout"));
  open("/");
  expect(screen.getByRole("alert").textContent).toBe("Не удалось проверить вход. Проверьте подключение и повторите.");
  convex.set("demo:sessionStatus", { valid: false });
  fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
  expect(await screen.findByLabelText("Пароль", { exact: false })).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  quiet.mockRestore();
});

test("[base-contract] demo label shows the verbatim text", () => {
  render(
    <MantineProvider theme={theme}>
      <DemoLabel />
    </MantineProvider>,
  );
  expect(screen.getByText("Демонстрационные данные").textContent).toBe("Демонстрационные данные");
});
