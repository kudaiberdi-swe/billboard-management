/// <reference types="vite/client" />
// schedule.day (f07-schedule) with hand-made screens and campaigns.
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply;
// the record-id argument `screenId` is covered by the NOT_FOUND cases (malformed and deleted id).
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const SESSION = "0b8f6a2e-5c1d-4e3f-9a7b-1c2d3e4f5a6b";
const DATE = "2026-10-30";

type ScreenInput = Partial<Doc<"screens">>;
type CampaignInput = { name: string; startHour: number; endHour: number; slotsPerCycle: number; startDate?: string; endDate?: string };

async function setup(screen: ScreenInput = {}, campaigns: CampaignInput[] = []) {
  const t = convexTest(schema, modules);
  const screenId = await t.run(async (ctx) => {
    await ctx.db.insert("demoSessions", { sessionId: SESSION, expiresAt: Date.now() + 86_400_000 });
    const id = await ctx.db.insert("screens", {
      code: "AST-001",
      name: "Тестовый экран",
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
      ...screen,
    });
    // inserted in array order, so creation order = array order
    for (const c of campaigns) {
      await ctx.db.insert("campaigns", {
        advertiser: "Demo Cola",
        startDate: DATE,
        endDate: DATE,
        screenIds: [id],
        creative: { kind: "placeholder", key: "placeholder-1" },
        ...c,
      });
    }
    return id;
  });
  return { t, screenId };
}

const day = (t: Awaited<ReturnType<typeof setup>>["t"], screenId: string, date = DATE, sessionId = SESSION) =>
  t.query(api.schedule.day, { sessionId, screenId, date });

async function failure(call: Promise<unknown>): Promise<Record<string, unknown>> {
  try {
    await call;
  } catch (e) {
    if (e instanceof ConvexError) return e.data as Record<string, unknown>;
    throw e;
  }
  throw new Error("expected the call to fail");
}

const owners = (slots: { campaignName: string | null }[]) => slots.map((s) => s.campaignName);
const hourOf = (r: Awaited<ReturnType<typeof day>>, h: number) => r.hours.find((x) => x.hour === h)!;

test("[f07-schedule] schedule lists the working hours", async () => {
  const { t, screenId } = await setup({}, [{ name: "Летняя акция", startHour: 8, endHour: 20, slotsPerCycle: 2 }]);
  const r = await day(t, screenId);
  expect(r.hours.map((h) => h.hour)).toEqual(Array.from({ length: 16 }, (_, i) => 7 + i));
  expect(hourOf(r, 7).used).toBe(0);
  expect(hourOf(r, 8).used).toBe(2);
  expect(r.screen).toMatchObject({ _id: screenId, code: "AST-001", workStartHour: 7, workEndHour: 23 });
  expect(r.date).toBe(DATE);
});

test("[f07-schedule] round-the-clock screen lists 24 hours", async () => {
  const { t, screenId } = await setup({ workStartHour: 0, workEndHour: 24 });
  const r = await day(t, screenId);
  expect(r.hours.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
});

test("[f07-schedule] opening an hour shows 12 slots", async () => {
  const { t, screenId } = await setup();
  const slots = hourOf(await day(t, screenId), 10).slots;
  expect(slots.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(slots.map((s) => s.startSec)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  expect(slots[11].endSec).toBe(60);
});

test("[f07-schedule] slots show time and campaign or Свободно", async () => {
  const { t, screenId } = await setup({}, [{ name: "Летняя акция", startHour: 8, endHour: 20, slotsPerCycle: 2 }]);
  const slots = hourOf(await day(t, screenId), 10).slots;
  expect(owners(slots)).toEqual(["Летняя акция", "Летняя акция", ...Array(10).fill(null)]);
  expect(slots[0].campaignId).not.toBeNull();
  expect(slots[2].campaignId).toBeNull();
});

test("[f07-schedule] campaign outside its dates is not shown", async () => {
  const { t, screenId } = await setup({}, [
    { name: "Летняя акция", startHour: 8, endHour: 20, slotsPerCycle: 2, startDate: "2026-11-01", endDate: "2026-11-30" },
  ]);
  const r = await day(t, screenId, "2026-10-31");
  expect(r.hours.flatMap((h) => owners(h.slots)).every((n) => n === null)).toBe(true);
  expect(r.hours.every((h) => h.used === 0)).toBe(true);
});

test("[f07-schedule] partial hour overlap gives each hour its own slots", async () => {
  const { t, screenId } = await setup({}, [
    { name: "A", startHour: 8, endHour: 12, slotsPerCycle: 2 },
    { name: "B", startHour: 10, endHour: 14, slotsPerCycle: 2 },
  ]);
  const r = await day(t, screenId);
  const free = (n: number) => Array(n).fill(null);
  expect(owners(hourOf(r, 9).slots)).toEqual(["A", "A", ...free(10)]);
  expect(owners(hourOf(r, 11).slots)).toEqual(["A", "A", "B", "B", ...free(8)]);
  expect(owners(hourOf(r, 13).slots)).toEqual(["B", "B", ...free(10)]);
  expect([hourOf(r, 9).used, hourOf(r, 11).used, hourOf(r, 13).used]).toEqual([2, 4, 2]);
});

test("[f07-schedule] schedule without a session is refused", async () => {
  const { t, screenId } = await setup();
  expect(await failure(day(t, screenId, DATE, crypto.randomUUID()))).toMatchObject({ code: "UNAUTHENTICATED" });
  const expired = crypto.randomUUID();
  await t.run((ctx) => ctx.db.insert("demoSessions", { sessionId: expired, expiresAt: Date.now() - 1 }));
  expect(await failure(day(t, screenId, DATE, expired))).toMatchObject({ code: "UNAUTHENTICATED" });
});

test("[f07-schedule] invalid date is refused", async () => {
  const { t, screenId } = await setup();
  for (const date of ["2026-13-45", "tomorrow"]) {
    expect(await failure(day(t, screenId, date))).toEqual({ code: "INVALID_INPUT", field: "date" });
  }
});

test("[f07-schedule] unknown screen is refused", async () => {
  const { t, screenId } = await setup();
  expect(await failure(day(t, "not-an-id"))).toEqual({ code: "NOT_FOUND", entity: "screens" });
  await t.run((ctx) => ctx.db.delete(screenId as Id<"screens">));
  expect(await failure(day(t, screenId))).toEqual({ code: "NOT_FOUND", entity: "screens" });
});
