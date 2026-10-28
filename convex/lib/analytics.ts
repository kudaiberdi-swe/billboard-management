// Simulated audience (ADR-0005, design D6). Deterministic from the screen code and the date only.
// Levels below are team demo values (order of magnitude from the ТЗ §10 example: 8 500 people,
// 6 000 with an estimated gaze, 2 400 looks per day), not client facts; the UI shows «Демонстрационные данные».
import { hash01 } from "./hash";
import type { ScreenRule } from "./slots";
import type { DateStr } from "./time";

export type Audience = { people: number; gazeEstimated: number; looks: number; vehicles: number | null };
export type AudienceProfile = {
  age: { "18-24": number; "25-34": number; "35-44": number; "45-54": number; "55+": number };
  gender: { male: number; female: number };
};

// Relative traffic weight per hour of day (integers, so the day is an exact sum of the hours).
const HOUR_WEIGHTS = [1, 1, 1, 1, 1, 2, 4, 6, 8, 7, 6, 6, 7, 7, 6, 6, 7, 8, 9, 8, 6, 4, 3, 2];
const CITY_LEVEL: Record<ScreenRule["city"], number> = { astana: 1, karaganda: 0.8, atyrau: 0.7, east_kz: 0.6 };
const WEEKDAY_LEVEL = [0.9, 1, 1, 1, 1, 1.05, 1.1]; // Sunday .. Saturday
const PEOPLE_PER_WEIGHT = 85;

/** Per-weight-unit values of a screen and day; every hour value is unit × its hour weight. */
function units(s: ScreenRule, date: DateStr) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const people = Math.round(
    PEOPLE_PER_WEIGHT * CITY_LEVEL[s.city] * WEEKDAY_LEVEL[weekday] * (0.75 + 0.5 * hash01(s.code, date, "people")),
  );
  const gazeEstimated = Math.floor(people * (0.65 + 0.1 * hash01(s.code, "gaze")));
  const looks = Math.floor(gazeEstimated * (0.35 + 0.1 * hash01(s.code, date, "looks")));
  const vehicles = s.hasVehicleMetric ? Math.round(people * (0.5 + 0.3 * hash01(s.code, date, "vehicles"))) : null;
  return { people, gazeEstimated, looks, vehicles };
}

function scaled(u: ReturnType<typeof units>, weight: number): Audience {
  return {
    people: u.people * weight,
    gazeEstimated: u.gazeEstimated * weight,
    looks: u.looks * weight,
    vehicles: u.vehicles === null ? null : u.vehicles * weight,
  };
}

/** null without a camera; zeros outside the working hours. */
export function audienceHour(s: ScreenRule, date: DateStr, hour: number): Audience | null {
  if (!s.hasCamera) return null;
  const working = s.workStartHour <= hour && hour < s.workEndHour;
  return scaled(units(s, date), working ? HOUR_WEIGHTS[hour] : 0);
}

/** Closed form: equals the sum of the 24 hours. */
export function audienceDay(s: ScreenRule, date: DateStr): Audience | null {
  if (!s.hasCamera) return null;
  let weight = 0;
  for (let h = s.workStartHour; h < s.workEndHour; h += 1) weight += HOUR_WEIGHTS[h];
  return scaled(units(s, date), weight);
}

/** Whole percents that sum to 100 (largest remainder). */
function toPercents(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * 100);
  const out = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  const missing = 100 - out.reduce((a, b) => a + b, 0);
  for (let k = 0; k < missing; k += 1) out[order[k][1]] += 1;
  return out;
}

/** Age and gender estimate per screen («предположительно» in the UI, D-10). */
export function audienceProfile(s: ScreenRule): AudienceProfile | null {
  if (!s.hasCamera) return null;
  const base = [18, 30, 24, 16, 12];
  const [a, b, c, d, e] = toPercents(base.map((w, i) => w * (0.8 + 0.4 * hash01(s.code, "age", String(i)))));
  const male = 45 + Math.floor(10 * hash01(s.code, "gender"));
  return { age: { "18-24": a, "25-34": b, "35-44": c, "45-54": d, "55+": e }, gender: { male, female: 100 - male } };
}
