import { expect, test } from "vitest";
import type { Conflict } from "../../../convex/lib/slots";
import type { Id } from "../../../convex/_generated/dataModel";
import { t } from "../../../shared/strings";
import { conflictList } from "./conflictList";

const a = "s1" as Id<"screens">;
const b = "s2" as Id<"screens">;
const screens = [
  { _id: b, code: "AST-002", name: "Demo Экран 2" },
  { _id: a, code: "AST-001", name: "Demo Экран 1" },
];
const c = (screenId: Id<"screens">, date: string, hour: number): Conflict => ({ screenId, date, hour, free: 2, requested: 3 });

test("[f06-campaign-create] conflict message names screens and hours", () => {
  const conflicts = ["2026-11-03", "2026-11-04", "2026-11-05"].flatMap((d) => [c(a, d, 10), c(a, d, 11)]);
  expect(t("ru", "errors.SLOT_CONFLICT", { list: conflictList(conflicts, screens) })).toBe(
    "Недостаточно свободных слотов. Конфликт: AST-001 Demo Экран 1: 03.11.2026–05.11.2026, 10:00–12:00.",
  );

  // several screens ordered by code, one date, split hour ranges, end hour 24:00
  const several = [c(b, "2026-11-03", 23), c(a, "2026-11-03", 8), c(a, "2026-11-03", 9), c(a, "2026-11-03", 14)];
  expect(conflictList(several, screens)).toBe(
    "AST-001 Demo Экран 1: 03.11.2026, 08:00–10:00, 14:00–15:00; AST-002 Demo Экран 2: 03.11.2026, 23:00–24:00",
  );

  // more conflicts than the list carries
  expect(conflictList([c(a, "2026-11-03", 10)], screens, 40)).toBe("AST-001 Demo Экран 1: 03.11.2026, 10:00–11:00 и другие");
});
