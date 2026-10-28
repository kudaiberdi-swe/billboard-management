import { expect, test } from "vitest";
import { ConvexError } from "convex/values";
import { text } from "../shared/strings";
import { errorText } from "./errors";

test("[base-contract] error code becomes text", () => {
  expect(errorText(new ConvexError({ code: "NOT_FOUND", entity: "campaigns" }))).toBe(
    "Запись не найдена. Возможно, демо было сброшено.",
  );
  expect(errorText(new ConvexError({ kind: "RateLimited", name: "signInPerAccount", retryAfter: 90_000 }))).toBe(
    "Слишком много попыток. Повторите через 2 мин.",
  );
});

test("[base-contract] unknown error", () => {
  const unknown = "Что-то пошло не так. Обновите страницу.";
  expect(errorText(new Error("boom"))).toBe(unknown);
  expect(errorText(new ConvexError({ code: "SOMETHING_ELSE" }))).toBe(unknown);
  expect(errorText(new ConvexError("plain"))).toBe(unknown);
});

test("[base-contract] status codes become text", () => {
  const codes = ["planned", "active", "finished", "online", "offline"];
  expect(codes.map((code) => text("ru", `status.${code}`))).toEqual([
    "Запланирована",
    "Активна",
    "Завершена",
    "онлайн",
    "офлайн",
  ]);
});
