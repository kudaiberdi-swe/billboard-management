// echo-gen strings@1.0.0: generated from the yaml contract. Change the contract, then run scaffold.mjs.
import { ru } from "./ru";

export const LOCALES = ["ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const SOURCE_LOCALE: Locale = "ru";
export type Catalog = typeof ru;
export const CATALOGS: Record<Locale, Catalog> = { ru };
