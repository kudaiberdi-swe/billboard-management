// Task 5.6: UI text lives only in shared/strings. Tests may hold expected texts verbatim from the spec.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

test("[base-contract] no inline text in components", () => {
  const dir = join(import.meta.dirname, ".");
  const offenders = (readdirSync(dir, { recursive: true }) as string[])
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .filter((file) => /[Ѐ-ӿ]/.test(readFileSync(join(dir, file), "utf8")));
  expect(offenders).toEqual([]);
});
