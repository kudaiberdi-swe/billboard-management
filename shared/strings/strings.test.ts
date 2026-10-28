// echo-block strings@1.0.0: tracked in .echo/blocks.lock.json. Keep a local edit with scaffold.mjs --accept <file> --reason "...".
// Every locale has every key of the source locale and no other; TODO(client) texts fall back to the source.
import { describe, expect, test } from "vitest";
import { CATALOGS, LOCALES, SOURCE_LOCALE, leaves, missingKeys, text } from "./index";

const sourceKeys = leaves(CATALOGS[SOURCE_LOCALE]).map(([key]) => key).sort();

describe("strings catalogs", () => {
  for (const locale of LOCALES) {
    test(`${locale} has the same keys as ${SOURCE_LOCALE}`, () => {
      expect(leaves(CATALOGS[locale]).map(([key]) => key).sort()).toEqual(sourceKeys);
    });

    test(`${locale} has no empty text`, () => {
      expect(leaves(CATALOGS[locale]).filter(([, value]) => value.trim() === "").map(([key]) => key)).toEqual([]);
    });
  }

  test("a text the client still owes shows the source locale", () => {
    for (const locale of LOCALES) {
      for (const key of missingKeys(locale)) {
        if (locale !== SOURCE_LOCALE) expect(text(locale, key)).toBe(text(SOURCE_LOCALE, key));
      }
    }
  });

  test("report: texts the client still owes", () => {
    for (const locale of LOCALES) {
      const missing = missingKeys(locale);
      if (missing.length > 0) console.log(`[strings] ${locale}: ${missing.length} TODO(client): ${missing.join(", ")}`);
    }
  });
});
