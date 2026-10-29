/// <reference types="vite/client" />
// f06-campaign-create backend scenarios (spec campaign-create). Seed screens, synthetic campaigns, frozen clock.
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply; the negative
// authz cases are the unknown / expired session ones, and screen ids are checked for unknown and malformed values.
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { isRateLimitError } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import schema from "./schema";
import { hourSlots, plannedShowsForDay } from "./lib/slots";
import { addDays, kzNow } from "./lib/time";
import { normalizeKey, rateLimiter } from "./rateLimits";
import { seedScreens } from "./seed";

const modules = import.meta.glob("./**/*.*s");
const PASSWORD = "synthetic-demo-password-for-tests";
const NOW = Date.parse("2026-11-01T06:00:00Z"); // 11:00 in UTC+5
const TODAY = kzNow(NOW).date;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("DEMO_PASSWORD", PASSWORD);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.run(async (ctx) => {
    for (const s of seedScreens()) await ctx.db.insert("screens", s);
  });
  const sessionId = crypto.randomUUID();
  expect(await t.mutation(api.demo.signIn, { sessionId, password: PASSWORD })).toEqual({ ok: true });
  const ids = new Map(await t.run(async (ctx) => (await ctx.db.query("screens").collect()).map((s) => [s.code, s._id] as const)));
  return { t, sessionId, id: (code: string) => ids.get(code)! };
}
type T = Awaited<ReturnType<typeof setup>>["t"];

async function failure(call: Promise<unknown>): Promise<{ code: string; field?: string; conflicts?: unknown[] }> {
  try {
    await call;
  } catch (e) {
    if (e instanceof ConvexError) return e.data;
    throw e;
  }
  throw new Error("expected the call to fail");
}

const campaigns = (t: T) => t.run((ctx) => ctx.db.query("campaigns").collect());
const screen = (t: T, id: Id<"screens">) => t.run(async (ctx) => (await ctx.db.get(id))!);
const store = (t: T, bytes: number, type: string) => t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })));

/** A campaign written directly, as an earlier save would have. */
const existing = (t: T, screenIds: Id<"screens">[], fields: Partial<Doc<"campaigns">> = {}) =>
  t.run((ctx) =>
    ctx.db.insert("campaigns", {
      name: "Demo Existing",
      advertiser: "Demo Brand",
      startDate: "2026-11-03",
      endDate: "2026-11-03",
      startHour: 10,
      endHour: 11,
      slotsPerCycle: 12,
      screenIds,
      creative: { kind: "placeholder", key: "placeholder-2" },
      ...fields,
    }),
  );

const request = (screenIds: Id<"screens">[], over: Record<string, unknown> = {}) => ({
  startDate: "2026-11-03",
  endDate: "2026-11-05",
  startHour: 8,
  endHour: 20,
  slotsPerCycle: 1,
  screenIds,
  ...over,
});
const form = (screenIds: Id<"screens">[], over: Record<string, unknown> = {}) => ({
  name: "Demo Campaign",
  advertiser: "Demo Brand",
  creative: { kind: "placeholder" as const, key: "placeholder-1" },
  ...request(screenIds),
  ...over,
});

// ---------- checkAvailability ----------

test("[f06-campaign-create] planned shows example from the SoW", async () => {
  const { t, sessionId, id } = await setup();
  const ids = ["AST-002", "AST-003", "AST-004"].map(id);
  for (const s of ids) expect(await screen(t, s)).toMatchObject({ workStartHour: 7, workEndHour: 23 });
  const r = await t.query(api.campaigns.checkAvailability, { sessionId, ...request(ids, { slotsPerCycle: 1, startHour: 8, endHour: 20 }) });
  expect(r.byScreen.map((s) => s.perDay)).toEqual([720, 720, 720]);
  expect(r.perDay).toBe(2160);
  expect(r.conflicts).toEqual([]);
});

test("[f06-campaign-create] preview clipped to working hours", async () => {
  const { t, sessionId, id } = await setup();
  const r = await t.query(api.campaigns.checkAvailability, {
    sessionId,
    ...request([id("AST-002")], { slotsPerCycle: 2, startHour: 6, endHour: 24, endDate: "2026-11-05" }),
  });
  expect(r.byScreen).toEqual([{ screenId: id("AST-002"), perDay: 1920 }]);
  expect(r.total).toBe(5760);
});

test("[f06-campaign-create] slot taken on the same screen and hour", async () => {
  const { t, sessionId, id } = await setup();
  await existing(t, [id("AST-001")], { slotsPerCycle: 6 });
  await existing(t, [id("AST-001")], { slotsPerCycle: 4 });
  const r = await t.query(api.campaigns.checkAvailability, {
    sessionId,
    ...request([id("AST-001")], { startDate: "2026-11-03", endDate: "2026-11-03", startHour: 10, endHour: 11, slotsPerCycle: 3 }),
  });
  expect(r.conflicts).toEqual([{ screenId: id("AST-001"), date: "2026-11-03", hour: 10, free: 2, requested: 3 }]);
  expect(r.conflictCount).toBe(1);
});

test("[f06-campaign-create] other screen or hour is free", async () => {
  const { t, sessionId, id } = await setup();
  await existing(t, [id("AST-001")]);
  const day = { startDate: "2026-11-03", endDate: "2026-11-03", slotsPerCycle: 3 };
  for (const req of [
    request([id("AST-002")], { ...day, startHour: 10, endHour: 11 }),
    request([id("AST-001")], { ...day, startHour: 11, endHour: 12 }),
  ]) {
    const r = await t.query(api.campaigns.checkAvailability, { sessionId, ...req });
    expect(r.conflicts).toEqual([]);
    expect(r.conflictCount).toBe(0);
  }
});

test("[f06-campaign-create] end date before start date", async () => {
  const { t, sessionId, id } = await setup();
  const call = t.query(api.campaigns.checkAvailability, {
    sessionId,
    ...request([id("AST-001")], { startDate: "2026-11-10", endDate: "2026-11-09" }),
  });
  expect(await failure(call)).toEqual({ code: "INVALID_INPUT", field: "endDate" });
});

test("[f06-campaign-create] check without a session", async () => {
  const { t, id } = await setup();
  const call = t.query(api.campaigns.checkAvailability, { sessionId: crypto.randomUUID(), ...request([id("AST-001")]) });
  expect((await failure(call)).code).toBe("UNAUTHENTICATED");
});

// ---------- create: input ----------

test("[f06-campaign-create] placeholder campaign is saved", async () => {
  const { t, sessionId, id } = await setup();
  const ids = ["AST-002", "AST-003", "AST-004"].map(id);
  const campaignId = await t.mutation(api.campaigns.create, {
    sessionId,
    ...form(ids, { name: "  Demo Осенняя акция ", advertiser: " Demo Cola", startDate: TODAY, endDate: addDays(TODAY, 6) }),
  });
  const saved = await t.run((ctx) => ctx.db.get(campaignId));
  expect(saved).toMatchObject({
    name: "Demo Осенняя акция",
    advertiser: "Demo Cola",
    startDate: TODAY,
    endDate: addDays(TODAY, 6),
    startHour: 8,
    endHour: 20,
    slotsPerCycle: 1,
    screenIds: ids,
    creative: { kind: "placeholder", key: "placeholder-1" },
  });
});

test("[f06-campaign-create] empty name is rejected", async () => {
  const { t, sessionId, id } = await setup();
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { name: "   " }) });
  expect(await failure(call)).toEqual({ code: "INVALID_INPUT", field: "name" });
  expect(await campaigns(t)).toEqual([]);
});

test("[wave-1 follow-up] create is refused at 200 campaigns", async () => {
  const { t, sessionId, id } = await setup();
  // Past campaigns on another screen: no slot conflict with the request.
  for (let i = 0; i < 199; i += 1) await existing(t, [id("KRG-001")], { startDate: "2026-01-01", endDate: "2026-01-01" });
  await t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")]) });
  expect(await campaigns(t)).toHaveLength(200);
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-003")]) });
  expect(await failure(call)).toEqual({ code: "INVALID_INPUT", field: "name" });
  expect(await campaigns(t)).toHaveLength(200);
});

test("[f06-campaign-create] period over 366 days", async () => {
  const { t, sessionId, id } = await setup();
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { startDate: "2026-01-01", endDate: "2027-01-02" }) });
  expect(await failure(call)).toEqual({ code: "INVALID_INPUT", field: "endDate" });
  // 366 days is the limit itself and passes
  const ok = await t.query(api.campaigns.checkAvailability, { sessionId, ...request([id("AST-002")], { startDate: "2026-01-01", endDate: "2027-01-01" }) });
  expect(ok.total).toBe(720 * 366);
});

test("[f06-campaign-create] show end hour not after start hour", async () => {
  const { t, sessionId, id } = await setup();
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { startHour: 20, endHour: 8 }) });
  expect(await failure(call)).toEqual({ code: "INVALID_INPUT", field: "endHour" });
});

test("[f06-campaign-create] unknown or repeated screen", async () => {
  const { t, sessionId, id } = await setup();
  const gone = await t.run(async (ctx) => {
    const s = (await ctx.db.get(id("AST-002")))!;
    const { _id, _creationTime, ...fields } = s;
    const copy = await ctx.db.insert("screens", fields);
    await ctx.db.delete(copy); // as after «Сбросить демо»: the old id no longer exists
    return copy;
  });
  for (const screenIds of [[gone], [id("AST-002"), id("AST-002")], []]) {
    const call = t.mutation(api.campaigns.create, { sessionId, ...form(screenIds) });
    expect(await failure(call)).toEqual({ code: "INVALID_INPUT", field: "screenIds" });
  }
  // A malformed id never reaches the handler: the argument validator rejects it.
  await expect(t.mutation(api.campaigns.create, { sessionId, ...form(["not-an-id" as Id<"screens">]) })).rejects.toThrow();
  expect(await campaigns(t)).toEqual([]);
});

test("[f06-campaign-create] too many slots per cycle", async () => {
  const { t, sessionId, id } = await setup();
  for (const slotsPerCycle of [13, 0, 1.5]) {
    const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { slotsPerCycle }) });
    expect(await failure(call)).toEqual({ code: "INVALID_INPUT", field: "slotsPerCycle" });
  }
});

// ---------- create: creative ----------

test("[f06-campaign-create] unknown placeholder is rejected", async () => {
  const { t, sessionId, id } = await setup();
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { creative: { kind: "placeholder", key: "placeholder-9" } }) });
  expect((await failure(call)).code).toBe("INVALID_CREATIVE");
  expect(await campaigns(t)).toEqual([]);
});

test("[f06-campaign-create] video campaign is saved", async () => {
  const { t, sessionId, id } = await setup();
  const storageId = await store(t, 1024 * 1024, "video/mp4");
  const campaignId = await t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { creative: { kind: "video", storageId } }) });
  expect((await t.run((ctx) => ctx.db.get(campaignId)))?.creative).toEqual({ kind: "video", storageId });
});

test("[f06-campaign-create] video of a wrong type is rejected", async () => {
  const { t, sessionId, id } = await setup();
  const storageId = await store(t, 1024, "image/png");
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { creative: { kind: "video", storageId } }) });
  expect((await failure(call)).code).toBe("INVALID_CREATIVE");
});

test("[f06-campaign-create] video over 20 MB is rejected", async () => {
  const { t, sessionId, id } = await setup();
  const storageId = await store(t, 20 * 1024 * 1024 + 1, "video/mp4");
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { creative: { kind: "video", storageId } }) });
  expect((await failure(call)).code).toBe("INVALID_CREATIVE");
});

test("[f06-campaign-create] missing video file is rejected", async () => {
  const { t, sessionId, id } = await setup();
  const storageId = await store(t, 1024, "video/webm");
  await t.run((ctx) => ctx.storage.delete(storageId));
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { creative: { kind: "video", storageId } }) });
  expect((await failure(call)).code).toBe("INVALID_CREATIVE");
});

test("[f06-campaign-create] video already used by another campaign", async () => {
  const { t, sessionId, id } = await setup();
  const storageId = await store(t, 1024, "video/webm");
  await t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { creative: { kind: "video", storageId } }) });
  const call = t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-003")], { creative: { kind: "video", storageId } }) });
  expect((await failure(call)).code).toBe("INVALID_CREATIVE");
  expect(await campaigns(t)).toHaveLength(1);
});

// ---------- upload URL ----------

test("[f06-campaign-create] upload URL for a valid session", async () => {
  const { t, sessionId } = await setup();
  const url = await t.mutation(api.campaigns.generateUploadUrl, { sessionId });
  expect(typeof url).toBe("string");
  expect(url.length).toBeGreaterThan(0);
});

test("[f06-campaign-create] sixth upload URL in a burst", async () => {
  const { t, sessionId } = await setup();
  for (let i = 0; i < 5; i += 1) expect(typeof (await t.mutation(api.campaigns.generateUploadUrl, { sessionId }))).toBe("string");
  try {
    await t.mutation(api.campaigns.generateUploadUrl, { sessionId });
    throw new Error("expected RateLimited");
  } catch (error) {
    expect(isRateLimitError(error)).toBe(true);
  }
});

test("[f06-campaign-create] upload URL without a session", async () => {
  const { t } = await setup();
  const unknown = crypto.randomUUID();
  expect((await failure(t.mutation(api.campaigns.generateUploadUrl, { sessionId: unknown }))).code).toBe("UNAUTHENTICATED");
  const left = await t.run(async (ctx) => [
    (await rateLimiter.getValue(ctx, "uploadUrlPerUser", { key: normalizeKey(unknown) })).value,
    (await rateLimiter.getValue(ctx, "uploadUrlGlobal")).value,
  ]);
  expect(left).toEqual([5, 10]); // both buckets full: per session 5, global 10
});

// ---------- create: conflicts ----------

test("[f06-campaign-create] conflict is re-checked on save", async () => {
  const { t, sessionId, id } = await setup();
  const ast1 = id("AST-001");
  await existing(t, [ast1], { slotsPerCycle: 9 });
  const req = request([ast1], { startDate: "2026-11-03", endDate: "2026-11-03", startHour: 10, endHour: 11, slotsPerCycle: 3 });
  expect((await t.query(api.campaigns.checkAvailability, { sessionId, ...req })).conflicts).toEqual([]);
  // Another visitor takes the last 3 free slots first.
  const other = crypto.randomUUID();
  await t.mutation(api.demo.signIn, { sessionId: other, password: PASSWORD });
  await t.mutation(api.campaigns.create, { sessionId: other, ...form([ast1], req) });
  const err = await failure(t.mutation(api.campaigns.create, { sessionId, ...form([ast1], req) }));
  expect(err).toEqual({ code: "SLOT_CONFLICT", conflicts: [{ screenId: ast1, date: "2026-11-03", hour: 10, free: 0, requested: 3 }] });
  expect(await campaigns(t)).toHaveLength(2);
});

const conflictBlocksTheSave = async () => {
  const { t, sessionId, id } = await setup();
  await existing(t, [id("AST-001")]);
  const before = (await campaigns(t)).length;
  // Two saves for the same last slots at once: exactly one wins.
  await existing(t, [id("AST-002")], { slotsPerCycle: 11 });
  const same = form([id("AST-002")], { startDate: "2026-11-03", endDate: "2026-11-03", startHour: 10, endHour: 11, slotsPerCycle: 1 });
  const both = await Promise.allSettled([t.mutation(api.campaigns.create, { sessionId, ...same }), t.mutation(api.campaigns.create, { sessionId, ...same })]);
  expect(both.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const lost = both.find((r) => r.status === "rejected")!;
  expect(((lost as PromiseRejectedResult).reason as ConvexError<{ code: string }>).data.code).toBe("SLOT_CONFLICT");

  const err = await failure(t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-001")], { startHour: 10, endHour: 11, endDate: "2026-11-03" }) }));
  expect(err.code).toBe("SLOT_CONFLICT");
  expect(err.conflicts?.length).toBeGreaterThan(0);
  expect(await campaigns(t)).toHaveLength(before + 2);
};
test("[f06-campaign-create] conflict blocks the save", conflictBlocksTheSave);
test("[c00-predeploy-hardening] conflict blocks the save", conflictBlocksTheSave);

// ---------- create: shows and persistence ----------

test("[f06-campaign-create] no shows outside the selected dates and hours", async () => {
  const { t, sessionId, id } = await setup();
  const ast1 = id("AST-001");
  const campaignId = await t.mutation(api.campaigns.create, { sessionId, ...form([ast1]) });
  const all = await campaigns(t);
  const s = await screen(t, ast1);
  const shows = (date: string, hour: number) => hourSlots(s, date, hour, all).some((slot) => slot.campaignId === campaignId);
  expect(shows("2026-11-03", 8)).toBe(true);
  for (const [date, hour] of [["2026-11-02", 10], ["2026-11-06", 10], ["2026-11-03", 7], ["2026-11-03", 20]] as const) {
    expect(shows(date, hour)).toBe(false);
  }
  expect(plannedShowsForDay(all.find((c) => c._id === campaignId)!, s, "2026-11-02")).toBe(0);
});

test("[f06-campaign-create] saved campaign is in the list and the schedule", async () => {
  const { t, sessionId, id } = await setup();
  const ast1 = id("AST-001");
  const campaignId = await t.mutation(api.campaigns.create, { sessionId, ...form([ast1], { name: "Demo Shared", startDate: TODAY, endDate: TODAY }) });
  // A later, separate transaction (another viewer, or the same one after a refresh) reads the stored row.
  const all = await campaigns(t);
  expect(all.map((c) => c._id)).toContain(campaignId);
  const slots = hourSlots(await screen(t, ast1), TODAY, 8, all);
  expect(slots).toHaveLength(12);
  expect(slots.map((s) => s.campaignName)).toContain("Demo Shared");
});

test("[f06-campaign-create] new campaign has no log shows", async () => {
  const { t, sessionId, id } = await setup();
  const campaignId = await t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { startDate: addDays(TODAY, -1), endDate: addDays(TODAY, 5) }) });
  const log = await t.run((ctx) => ctx.db.query("showLog").withIndex("by_campaign", (q) => q.eq("campaignId", campaignId)).collect());
  expect(log).toEqual([]);
});

// ---------- session guard ----------

test("[f06-campaign-create] create without a session", async () => {
  const { t, id } = await setup();
  const expired = crypto.randomUUID();
  await t.run((ctx) => ctx.db.insert("demoSessions", { sessionId: expired, expiresAt: NOW - 1 }));
  for (const sessionId of [crypto.randomUUID(), expired]) {
    expect((await failure(t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")]) }))).code).toBe("UNAUTHENTICATED");
  }
  expect(await campaigns(t)).toEqual([]);
});

test("[f06-campaign-create] status argument is rejected", async () => {
  const { t, sessionId, id } = await setup();
  const args = { sessionId, ...form([id("AST-002")]), status: "active" } as Parameters<typeof t.mutation<typeof api.campaigns.create>>[1];
  await expect(t.mutation(api.campaigns.create, args)).rejects.toThrow(/status/);
  expect(await campaigns(t)).toEqual([]);
});

// ---------- orphan upload sweep (security gate S6, not a spec scenario) ----------

test("orphan sweep deletes only unused uploads older than 24 h", async () => {
  const { t, sessionId, id } = await setup();
  const used = await store(t, 1024, "video/mp4");
  const orphan = await store(t, 1024, "video/mp4");
  await t.mutation(api.campaigns.create, { sessionId, ...form([id("AST-002")], { creative: { kind: "video", storageId: used } }) });
  vi.setSystemTime(NOW + 25 * 3_600_000);
  const fresh = await store(t, 1024, "video/mp4");
  expect(await t.mutation(internal.campaigns.sweepOrphanUploads, {})).toBe(1);
  const left = await t.run(async (ctx) => (await ctx.db.system.query("_storage").collect()).map((f) => f._id));
  expect(left.sort()).toEqual([used, fresh].sort());
  expect(left).not.toContain(orphan);
});
