// Deterministic synthetic seed (design D8, ADR-0006). Dates are offsets from `today`; no Math.random.
// Team demo values, not client facts: the split of screens per city, the offline / 24/7 / camera
// screens, the other «Demo …» campaigns and every date offset below.
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { PLACEHOLDER_KEYS, type City } from "./lib/config";
import { hash01 } from "./lib/hash";
import { simulateShowLog } from "./lib/showLog";
import { findConflicts, type CampaignRule, type ScreenRule } from "./lib/slots";
import { addDays, KZ_OFFSET_HOURS, kzNow, type DateStr } from "./lib/time";

const CITY_PLAN: { city: City; prefix: string; count: number; lat: number; lng: number }[] = [
  { city: "astana", prefix: "AST", count: 35, lat: 51.128, lng: 71.43 },
  { city: "karaganda", prefix: "KRG", count: 25, lat: 49.806, lng: 73.085 },
  { city: "atyrau", prefix: "ATY", count: 20, lat: 47.094, lng: 51.924 },
  { city: "east_kz", prefix: "VKO", count: 20, lat: 49.948, lng: 82.628 },
];
const DISTRICTS = ["Центр", "Север", "Юг", "Восток", "Запад", "Набережная", "Парк", "Вокзал"];
const SCREEN_IMAGES = ["screen-1", "screen-2", "screen-3", "screen-4"];
const OFFLINE = new Set([4, 23, 41, 58, 77, 93]); // global screen numbers 0..99
const ALL_DAY = new Set([0, 12, 36, 48, 61, 70, 81, 90]);
const SHORT_DAY = new Set([7, 30, 52, 66, 85]); // 08:00–22:00

export type SeedScreen = Omit<Doc<"screens">, "_id" | "_creationTime">;

export function seedScreens(): SeedScreen[] {
  const out: SeedScreen[] = [];
  for (const plan of CITY_PLAN) {
    for (let i = 1; i <= plan.count; i += 1) {
      const n = out.length;
      const code = `${plan.prefix}-${String(i).padStart(3, "0")}`;
      const [workStartHour, workEndHour] = ALL_DAY.has(n) ? [0, 24] : SHORT_DAY.has(n) ? [8, 22] : [7, 23];
      out.push({
        code,
        name: `${code} ${DISTRICTS[n % DISTRICTS.length]}`,
        city: plan.city,
        address: `ул. Демонстрационная-${(n % 12) + 1}, ${Math.floor(hash01(code, "house") * 90) + 1}`,
        lat: Math.round((plan.lat + (hash01(code, "lat") - 0.5) * 0.08) * 1e5) / 1e5,
        lng: Math.round((plan.lng + (hash01(code, "lng") - 0.5) * 0.12) * 1e5) / 1e5,
        status: OFFLINE.has(n) ? "offline" : "online",
        workStartHour,
        workEndHour,
        hasCamera: n % 5 !== 4,
        hasVehicleMetric: n % 2 === 0,
        imageKey: SCREEN_IMAGES[n % SCREEN_IMAGES.length],
      });
    }
  }
  return out;
}

type SeedCampaign = {
  name: string;
  advertiser: string;
  from: number; // offset from today, days
  to: number;
  startHour: number;
  endHour: number;
  slotsPerCycle: number;
  screens: (code: string) => boolean;
  log?: true; // seeded show log (the 2 active named campaigns)
};

const num = (code: string) => Number(code.slice(4));
const city = (prefix: string) => (code: string) => code.startsWith(prefix);

const CAMPAIGNS: SeedCampaign[] = [
  // The 3 named campaigns (F-5 AC1).
  { name: "Летняя акция", advertiser: "Demo Cola", from: -10, to: 20, startHour: 8, endHour: 22, slotsPerCycle: 2, screens: (c) => (city("AST")(c) && num(c) <= 20) || (city("KRG")(c) && num(c) <= 10), log: true },
  { name: "Открытие магазина", advertiser: "Demo Market", from: -5, to: 10, startHour: 9, endHour: 21, slotsPerCycle: 3, screens: (c) => (city("AST")(c) && num(c) >= 10 && num(c) <= 30) || city("ATY")(c), log: true },
  { name: "Презентация автомобиля", advertiser: "Demo Auto", from: 5, to: 35, startHour: 10, endHour: 20, slotsPerCycle: 2, screens: (c) => (city("AST")(c) && num(c) <= 15) || city("VKO")(c) },
  // Other demo campaigns: one ends within 3 days, one is «Завершена».
  { name: "Осенняя распродажа", advertiser: "Demo Fashion", from: -20, to: 2, startHour: 7, endHour: 23, slotsPerCycle: 2, screens: city("KRG") },
  { name: "Новый тариф", advertiser: "Demo Telecom", from: -40, to: -10, startHour: 8, endHour: 20, slotsPerCycle: 1, screens: () => true },
  { name: "Неделя здоровья", advertiser: "Demo Pharma", from: -3, to: 25, startHour: 7, endHour: 12, slotsPerCycle: 1, screens: (c) => city("VKO")(c) || city("ATY")(c) },
  { name: "Кофе с собой", advertiser: "Demo Coffee", from: -1, to: 14, startHour: 7, endHour: 11, slotsPerCycle: 2, screens: city("AST") },
  { name: "Банковская карта", advertiser: "Demo Bank", from: 1, to: 30, startHour: 12, endHour: 18, slotsPerCycle: 3, screens: (c) => city("AST")(c) || city("KRG")(c) },
  { name: "Доставка продуктов", advertiser: "Demo Delivery", from: -15, to: 45, startHour: 18, endHour: 23, slotsPerCycle: 2, screens: () => true },
  { name: "Городской фестиваль", advertiser: "Demo Events", from: 10, to: 12, startHour: 0, endHour: 24, slotsPerCycle: 1, screens: (c) => city("AST")(c) && num(c) <= 10 },
];

/** The seed's clock: `today` at the current UTC+5 hour, so the seeded log counts the finished hours of today. */
export function seedClock(today: DateStr, nowMs = Date.now()): number {
  return Date.parse(`${today}T00:00:00Z`) + (kzNow(nowMs).hour - KZ_OFFSET_HOURS) * 3_600_000;
}

/** Writes the whole demo data set. Callers make sure the domain tables are empty. */
export async function seedData(ctx: MutationCtx, today: DateStr): Promise<void> {
  const nowMs = seedClock(today);
  const screens: ScreenRule[] = [];
  const byCode = new Map<string, Id<"screens">>();
  for (const s of seedScreens()) {
    const _id = await ctx.db.insert("screens", s);
    byCode.set(s.code, _id);
    screens.push({ ...s, _id });
    if (s.status === "offline") {
      const hoursAgo = 1 + Math.floor(hash01(s.code, "offline") * 47);
      await ctx.db.insert("screenEvents", { screenId: _id, at: nowMs - hoursAgo * 3_600_000, kind: "went_offline" });
    }
  }

  const placed: CampaignRule[] = [];
  for (const [i, c] of CAMPAIGNS.entries()) {
    const fields = {
      name: c.name,
      advertiser: c.advertiser,
      startDate: addDays(today, c.from),
      endDate: addDays(today, c.to),
      startHour: c.startHour,
      endHour: c.endHour,
      slotsPerCycle: c.slotsPerCycle,
      screenIds: [...byCode].filter(([code]) => c.screens(code)).map(([, id]) => id),
    };
    if (findConflicts(fields, screens, placed).length > 0) throw new Error(`seed: «${c.name}» overfills a slot hour`);
    const _id = await ctx.db.insert("campaigns", {
      ...fields,
      creative: { kind: "placeholder", key: PLACEHOLDER_KEYS[i % PLACEHOLDER_KEYS.length] },
    });
    const doc = (await ctx.db.get(_id))!;
    placed.push(doc);
    if (c.log) await replaceShowLog(ctx, doc, screens, nowMs);
  }
}

/** Replaces a campaign's show log with a fresh simulation (seed now, «Смоделировать показы» in F-10). */
export async function replaceShowLog(ctx: MutationCtx, c: CampaignRule, screens: ScreenRule[], nowMs: number): Promise<number> {
  const old = await ctx.db
    .query("showLog")
    .withIndex("by_campaign", (q) => q.eq("campaignId", c._id))
    .collect(); // shortcut: bounded by screens × campaign days (≤ 100 × 366); paginate if F-10 allows longer periods
  for (const row of old) await ctx.db.delete(row._id);
  const rows = simulateShowLog(c, screens, nowMs);
  for (const row of rows) await ctx.db.insert("showLog", { campaignId: c._id, ...row });
  return rows.length;
}
