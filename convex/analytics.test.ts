/// <reference types="vite/client" />
// analytics.screenPeriod (f08-audience-analytics) with hand-made synthetic screens.
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply;
// the record-id argument `screenId` is covered by the NOT_FOUND cases (malformed and deleted id).
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import { screenPeriod } from "./analytics";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";
import { audienceDay, audienceProfile } from "./lib/analytics";
import { addDays, datesInRange } from "./lib/time";

const modules = import.meta.glob("./**/*.*s");
const SESSION = "0b8f6a2e-5c1d-4e3f-9a7b-1c2d3e4f5a6b";
const TO = "2026-10-30";
const WEEK = { from: addDays(TO, -6), to: TO };

type ScreenInput = Partial<Doc<"screens">>;
const CAMERA: ScreenInput = { hasCamera: true, hasVehicleMetric: true };

async function setup(...screens: ScreenInput[]) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("demoSessions", { sessionId: SESSION, expiresAt: Date.now() + 86_400_000 });
    const out: Id<"screens">[] = [];
    for (const [i, s] of (screens.length ? screens : [CAMERA]).entries()) {
      out.push(
        await ctx.db.insert("screens", {
          code: `AST-00${i + 1}`,
          name: `Тестовый экран ${i + 1}`,
          city: "astana",
          address: "synthetic",
          lat: 51.1,
          lng: 71.4,
          status: "online",
          workStartHour: 7,
          workEndHour: 23,
          hasCamera: false,
          hasVehicleMetric: false,
          imageKey: "screen-1.jpg",
          ...s,
        }),
      );
    }
    return out;
  });
  const doc = (id: Id<"screens">) => t.run(async (ctx) => (await ctx.db.get(id))!);
  return { t, ids, doc };
}
type T = Awaited<ReturnType<typeof setup>>["t"];

const period = (t: T, screenId: string, range = WEEK, sessionId = SESSION) =>
  t.query(api.analytics.screenPeriod, { sessionId, screenId, ...range });

async function failure(call: Promise<unknown>): Promise<Record<string, unknown>> {
  try {
    await call;
  } catch (e) {
    if (e instanceof ConvexError) return e.data as Record<string, unknown>;
    throw e;
  }
  throw new Error("expected the call to fail");
}

/** Oracle: the closed-form day values of the generator, summed over the period. */
function daySums(s: Doc<"screens">, from: string, to: string) {
  const sum = { people: 0, gazeEstimated: 0, looks: 0, vehicles: 0 };
  for (const d of datesInRange(from, to)) {
    const a = audienceDay(s, d)!;
    sum.people += a.people;
    sum.gazeEstimated += a.gazeEstimated;
    sum.looks += a.looks;
    sum.vehicles += a.vehicles ?? 0;
  }
  return sum;
}

test("[f08-audience-analytics] screen period values", async () => {
  const { t, ids, doc } = await setup();
  const r = await period(t, ids[0]);
  const sum = daySums(await doc(ids[0]), WEEK.from, WEEK.to);
  expect(r.audience).toMatchObject({ people: sum.people, gazeEstimated: sum.gazeEstimated, looks: sum.looks });
  expect(r.audience!.people).toBeGreaterThan(0);
});

test("[f08-audience-analytics] look share among gaze", async () => {
  const { t, ids } = await setup(CAMERA, { ...CAMERA, workStartHour: 7, workEndHour: 7 });
  const a = (await period(t, ids[0])).audience!;
  expect(a.lookShare).toBe(Math.round((a.looks / a.gazeEstimated) * 1000) / 10);
  expect(Number.isInteger(a.lookShare * 10)).toBe(true);
  // a screen with no working hour has nobody with an estimated gaze
  const empty = (await period(t, ids[1])).audience!;
  expect(empty.gazeEstimated).toBe(0);
  expect(empty.lookShare).toBe(0);
});

test("[f08-audience-analytics] no session is refused", async () => {
  const { t, ids } = await setup();
  expect(await failure(period(t, ids[0], WEEK, crypto.randomUUID()))).toMatchObject({ code: "UNAUTHENTICATED" });
  const expired = crypto.randomUUID();
  await t.run((ctx) => ctx.db.insert("demoSessions", { sessionId: expired, expiresAt: Date.now() - 1 }));
  expect(await failure(period(t, ids[0], WEEK, expired))).toMatchObject({ code: "UNAUTHENTICATED" });
});

test("[f08-audience-analytics] invalid period is refused", async () => {
  const { t, ids } = await setup();
  const id = ids[0];
  expect(await failure(period(t, id, { from: TO, to: addDays(TO, -1) }))).toEqual({ code: "INVALID_INPUT", field: "to" });
  expect(await failure(period(t, id, { from: "30.10.2026", to: TO }))).toEqual({ code: "INVALID_INPUT", field: "from" });
  expect(await failure(period(t, id, { from: TO, to: "2026-02-30" }))).toEqual({ code: "INVALID_INPUT", field: "to" });
  expect(await failure(period(t, id, { from: addDays(TO, -366), to: TO }))).toEqual({ code: "INVALID_INPUT", field: "period" });
  // exactly 366 days is allowed
  expect((await period(t, id, { from: addDays(TO, -365), to: TO })).audience).not.toBeNull();
});

test("[f08-audience-analytics] unknown billboard is refused", async () => {
  const { t, ids } = await setup();
  expect(await failure(period(t, "not-an-id"))).toEqual({ code: "NOT_FOUND", entity: "screen" });
  await t.run((ctx) => ctx.db.delete(ids[0]));
  expect(await failure(period(t, ids[0]))).toEqual({ code: "NOT_FOUND", entity: "screen" });
});

test("[f08-audience-analytics] vehicles only where measured", async () => {
  const { t, ids, doc } = await setup(CAMERA, { hasCamera: true, hasVehicleMetric: false });
  const withMetric = await period(t, ids[0]);
  expect(withMetric.audience!.vehicles).toBe(daySums(await doc(ids[0]), WEEK.from, WEEK.to).vehicles);
  expect(withMetric.audience!.vehicles).toBeGreaterThan(0);
  const without = await period(t, ids[1]);
  expect(without.screen.hasVehicleMetric).toBe(false);
  expect(without.audience!.vehicles).toBeNull();
});

test("[f08-audience-analytics] screen without a camera", async () => {
  const { t, ids } = await setup({ hasCamera: false, hasVehicleMetric: false });
  const r = await period(t, ids[0]);
  expect(r.screen.hasCamera).toBe(false);
  expect(r.audience).toBeNull();
});

test("[f08-audience-analytics] age groups and gender", async () => {
  const { t, ids, doc } = await setup();
  const { profile } = (await period(t, ids[0])).audience!;
  const generated = audienceProfile(await doc(ids[0]))!;
  expect(profile.gender).toEqual(generated.gender);
  expect(profile.age).toEqual(Object.entries(generated.age).map(([group, share]) => ({ group, share })));
  expect(profile.age.map((a) => a.group)).toEqual(["18-24", "25-34", "35-44", "45-54", "55+"]);
  expect(profile.age.reduce((s, a) => s + a.share, 0)).toBe(100);
  expect(profile.gender.male + profile.gender.female).toBe(100);
});

test("[f08-audience-analytics] audience and looks per hour", async () => {
  const { t, ids } = await setup({ ...CAMERA, workStartHour: 7, workEndHour: 23 });
  const a = (await period(t, ids[0], { from: addDays(TO, -2), to: TO })).audience!;
  expect(a.byHour.map((p) => p.hour)).toEqual(Array.from({ length: 24 }, (_, h) => h));
  for (const p of a.byHour) {
    if (p.hour < 7 || p.hour >= 23) expect(p).toEqual({ hour: p.hour, people: 0, looks: 0 });
    else expect(p.people).toBeGreaterThan(0);
  }
  expect(a.byHour.reduce((s, p) => s + p.people, 0)).toBe(a.people);
  expect(a.byHour.reduce((s, p) => s + p.looks, 0)).toBe(a.looks);
});

test("[f08-audience-analytics] no personal data", async () => {
  const { t, ids } = await setup(CAMERA, { hasCamera: false });
  for (const id of ids) {
    const r = await period(t, id);
    expect(Object.keys(r).sort()).toEqual(["audience", "screen"]);
    expect(Object.keys(r.screen).sort()).toEqual(["_id", "city", "code", "hasCamera", "hasVehicleMetric", "name"]);
    if (r.audience) {
      const { byHour, profile, ...totals } = r.audience;
      for (const n of [...Object.values(totals), ...profile.age.map((a) => a.share), ...Object.values(profile.gender)])
        expect(typeof n).toBe("number");
      for (const p of byHour) expect(Object.keys(p).sort()).toEqual(["hour", "looks", "people"]);
    }
  }
});

// Convex deploy rejects object validator keys that are not identifiers (e.g. "18-24"); convex-test does not.
test("returns validator of analytics.screenPeriod has identifier keys only", () => {
  const keys: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: unknown; value?: unknown };
    if (n.type === "object" && n.value && typeof n.value === "object") keys.push(...Object.keys(n.value));
    Object.values(node).forEach(walk);
  };
  walk(JSON.parse((screenPeriod as unknown as { exportReturns: () => string }).exportReturns()));
  expect(keys).toContain("group");
  for (const k of keys) expect(k).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
});
