// echo-block strings@1.0.0: tracked in .echo/blocks.lock.json. Keep a local edit with scaffold.mjs --accept <file> --reason "...".
// UI strings. Source locale first (locales.ts); every other locale has the same keys (StringsShape, strings.test.ts).
// A text that is missing, empty or still "TODO(client)" falls back to the source locale, so a screen never shows a hole.
// Contract texts (roles, entities, routes, the product name) come from the yaml contract; change them there.
import { CATALOGS, LOCALES, SOURCE_LOCALE, type Catalog, type Locale } from "./locales";
import type { StringKey } from "./types";

export { CATALOGS, LOCALES, SOURCE_LOCALE, type Locale };
export type StringsKey = StringKey<Catalog>;
export type Params = Record<string, string | number>;

const MARKER = "TODO(client)";

function lookup(locale: Locale, key: string): string | undefined {
  let node: unknown = CATALOGS[locale];
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** True for a text the client still owes. */
export function isMissing(value: string | undefined): boolean {
  return value === undefined || value.trim() === "" || value.startsWith(MARKER);
}

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Text of a key in a locale. `{name}` placeholders are filled from params. */
export function t(locale: Locale, key: StringsKey, params?: Params): string {
  return text(locale, key, params);
}

/** Like t() for a key built at runtime (for example `errors.${code}` from the server). An unknown key returns itself. */
export function text(locale: Locale, key: string, params?: Params): string {
  let value = lookup(locale, key);
  if (locale !== SOURCE_LOCALE && isMissing(value)) value = lookup(SOURCE_LOCALE, key);
  return value === undefined ? key : fill(value, params);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Plural form by the locale's rules (ru: one/few/many/other). */
export function plural(locale: Locale, count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }): string {
  return fill(forms[new Intl.PluralRules(locale).select(count)] ?? forms.other, { n: count });
}

/** [dotted key, text] for every leaf. */
export function leaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

/** Keys whose text in this locale the client still owes (shown in the source locale meanwhile). */
export function missingKeys(locale: Locale): string[] {
  return leaves(CATALOGS[locale])
    .filter(([, value]) => isMissing(value))
    .map(([key]) => key);
}
