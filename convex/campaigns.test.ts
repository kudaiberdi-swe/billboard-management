/// <reference types="vite/client" />
// f05-campaign-list: campaigns.list and campaigns.get against the seed, on a fixed clock (today 2026-10-28 in UTC+5).
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply.
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { plannedShows } from "./lib/slots";
import { addDays } from "./lib/time";

const modules = import.meta.glob("./**/*.*s");
const PASSWORD = "synthetic-demo-password-for-tests";
const TODAY = "2026-10-28";

function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}
type T = ReturnType<typeof setup>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse(`${TODAY}T06:00:00Z`)); // 11:00 in UTC+5
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function seeded() {
  const t = setup();
  await t.mutation(internal.demo.seed, {});
  vi.stubEnv("DEMO_PASSWORD", PASSWORD);
  const sessionId = crypto.randomUUID();
  expect(await t.mutation(api.demo.signIn, { sessionId, password: PASSWORD })).toEqual({ ok: true });
  return { t, sessionId };
}

async function errorCode(call: Promise<unknown>): Promise<string> {
  try {
    await call;
  } catch (e) {
    if (e instanceof ConvexError) return (e.data as { code: string }).code;
    throw e;
  }
  throw new Error("expected the call to fail");
}

/** A campaign on the first seeded screen with the given period. */
async function addCampaign(t: T, startDate: string, endDate: string): Promise<Id<"campaigns">> {
  return t.run(async (ctx) => {
    const screen = (await ctx.db.query("screens").first())!;
    return ctx.db.insert("campaigns", {
      name: `Test ${startDate}`,
      advertiser: "Demo Test",
      startDate,
      endDate,
      startHour: 0,
      endHour: 1,
      slotsPerCycle: 1,
      screenIds: [screen._id],
      creative: { kind: "placeholder", key: "placeholder-1" },
    });
  });
}

const byName = async (t: T, sessionId: string, name: string) =>
  (await t.query(api.campaigns.list, { sessionId })).find((c) => c.name === name)!;

describe("campaigns.list", () => {
  test("[f05-campaign-list] seed has the three named campaigns", async () => {
    const { t, sessionId } = await seeded();
    const rows = await t.query(api.campaigns.list, { sessionId });
    const triple = (name: string) => rows.filter((c) => c.name === name).map((c) => [c.name, c.advertiser, c.status]);
    expect(triple("Летняя акция")).toEqual([["Летняя акция", "Demo Cola", "active"]]);
    expect(triple("Открытие магазина")).toEqual([["Открытие магазина", "Demo Market", "active"]]);
    expect(triple("Презентация автомобиля")).toEqual([["Презентация автомобиля", "Demo Auto", "planned"]]);
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });

  test("[f05-campaign-list] newest campaign comes first", async () => {
    const { t, sessionId } = await seeded();
    const id = await addCampaign(t, TODAY, TODAY);
    expect((await t.query(api.campaigns.list, { sessionId }))[0]._id).toBe(id);
  });

  const rowShowsAllCampaignFields = async () => {
    const { t, sessionId } = await seeded();
    const row = await byName(t, sessionId, "Летняя акция");
    expect(row).toMatchObject({
      advertiser: "Demo Cola",
      startDate: addDays(TODAY, -10),
      endDate: addDays(TODAY, 20),
      cities: ["astana", "karaganda"],
      status: "active",
    });
    const expected = await t.run(async (ctx) => {
      const c = (await ctx.db.get(row._id))!;
      const screens = await ctx.db.query("screens").collect();
      return { count: c.screenIds.length, planned: plannedShows(c, screens, c.startDate, c.endDate).total };
    });
    expect(row.screenCount).toBe(expected.count);
    expect(row.plannedShows).toBe(expected.planned);
    expect(row.plannedShows).toBeGreaterThan(0);
    expect(typeof row.logShows).toBe("number");
  };
  test("[f05-campaign-list] row shows all campaign fields", rowShowsAllCampaignFields);
  test("[c00-predeploy-hardening] row shows all campaign fields", rowShowsAllCampaignFields);

  const logShowsAreTheSumOfTheShowLog = async () => {
    const { t, sessionId } = await seeded();
    const row = await byName(t, sessionId, "Летняя акция");
    const sum = await t.run(async (ctx) =>
      (await ctx.db.query("showLog").collect()).filter((r) => r.campaignId === row._id).reduce((s, r) => s + r.shows, 0),
    );
    expect(row.logShows).toBe(sum);
    expect(row.logShows).toBeGreaterThan(0);
    expect(row.logShows).toBeLessThanOrEqual(row.plannedShows);
  };
  test("[f05-campaign-list] log shows are the sum of the show log", logShowsAreTheSumOfTheShowLog);
  test("[c00-predeploy-hardening] log shows are the sum of the show log", logShowsAreTheSumOfTheShowLog);

  const campaignWithoutLogShowsZero = async () => {
    const { t, sessionId } = await seeded();
    expect((await byName(t, sessionId, "Презентация автомобиля")).logShows).toBe(0);
  };
  test("[f05-campaign-list] campaign without log shows zero", campaignWithoutLogShowsZero);
  test("[c00-predeploy-hardening] campaign without log shows zero", campaignWithoutLogShowsZero);

  test("[f05-campaign-list] status before the start date", async () => {
    const { t, sessionId } = await seeded();
    const id = await addCampaign(t, "2026-10-29", "2026-10-30");
    expect((await t.query(api.campaigns.list, { sessionId })).find((c) => c._id === id)!.status).toBe("planned");
  });

  test("[f05-campaign-list] status between start and end", async () => {
    const { t, sessionId } = await seeded();
    const id = await addCampaign(t, "2026-10-28", "2026-10-28");
    expect((await t.query(api.campaigns.list, { sessionId })).find((c) => c._id === id)!.status).toBe("active");
  });

  test("[f05-campaign-list] status after the end date", async () => {
    const { t, sessionId } = await seeded();
    const id = await addCampaign(t, "2026-10-20", "2026-10-27");
    expect((await t.query(api.campaigns.list, { sessionId })).find((c) => c._id === id)!.status).toBe("finished");
  });

  test("[f05-campaign-list] seed has no real brand names", async () => {
    const { t, sessionId } = await seeded();
    await t.mutation(api.demo.reset, { sessionId });
    const rows = await t.query(api.campaigns.list, { sessionId });
    expect(rows.length).toBeGreaterThan(0);
    for (const c of rows) expect(c.advertiser.startsWith("Demo ")).toBe(true);
  });

  test("[f05-campaign-list] list without session is refused", async () => {
    const { t } = await seeded();
    for (const sessionId of [crypto.randomUUID(), "", "not-a-session"]) {
      expect(await errorCode(t.query(api.campaigns.list, { sessionId }))).toBe("UNAUTHENTICATED");
    }
    // expired session: valid at sign-in, refused 7 days later
    const { t: t2, sessionId } = await seeded();
    vi.setSystemTime(Date.now() + 7 * 86_400_000);
    expect(await errorCode(t2.query(api.campaigns.list, { sessionId }))).toBe("UNAUTHENTICATED");
  });
});

describe("campaigns.get", () => {
  const perScreenValuesAddUpToTheTotals = async () => {
    const { t, sessionId } = await seeded();
    const { _id } = await byName(t, sessionId, "Летняя акция");
    const card = await t.query(api.campaigns.get, { sessionId, campaignId: _id });
    expect(card.logShows).toBeGreaterThan(0);
    expect(card.screens.reduce((s, x) => s + x.plannedShows, 0)).toBe(card.plannedShows);
    expect(card.screens.reduce((s, x) => s + x.logShows, 0)).toBe(card.logShows);
    expect(card.screens.map((s) => s.code)).toEqual(card.screens.map((s) => s.code).sort());
    expect(card).toMatchObject({ startHour: 8, endHour: 22, slotsPerCycle: 2, status: "active" });
    expect(card.creative.kind).toBe("placeholder");
  };
  test("[f05-campaign-list] per screen values add up to the totals", perScreenValuesAddUpToTheTotals);
  test("[c00-predeploy-hardening] per screen values add up to the totals", perScreenValuesAddUpToTheTotals);
  test("[c01-global-demo-notice] per screen values add up to the totals", perScreenValuesAddUpToTheTotals);

  const offlineScreenIsMarkedOnTheCard = async () => {
    const { t, sessionId } = await seeded();
    const campaignId = await t.run(async (ctx) => {
      const offline = (await ctx.db.query("screens").collect()).find((s) => s.status === "offline")!;
      return (await ctx.db.query("campaigns").collect()).find((c) => c.screenIds.includes(offline._id))!._id;
    });
    const card = await t.query(api.campaigns.get, { sessionId, campaignId });
    expect(card.screens.some((s) => s.status === "offline")).toBe(true);
  };
  test("[f05-campaign-list] offline screen is marked on the card", offlineScreenIsMarkedOnTheCard);
  test("[c00-predeploy-hardening] offline screen is marked on the card", offlineScreenIsMarkedOnTheCard);
  test("[c01-global-demo-notice] offline screen is marked on the card", offlineScreenIsMarkedOnTheCard);

  test("[f05-campaign-list] card with a malformed id", async () => {
    const { t, sessionId } = await seeded();
    for (const campaignId of ["abc", ""]) {
      expect(await errorCode(t.query(api.campaigns.get, { sessionId, campaignId }))).toBe("NOT_FOUND");
    }
  });

  test("[f05-campaign-list] card of a deleted campaign", async () => {
    const { t, sessionId } = await seeded();
    const { _id } = await byName(t, sessionId, "Летняя акция");
    await t.mutation(api.demo.reset, { sessionId });
    expect(await errorCode(t.query(api.campaigns.get, { sessionId, campaignId: _id }))).toBe("NOT_FOUND");
    // a valid id of another table is not a campaign either
    const screenId = await t.run(async (ctx) => (await ctx.db.query("screens").first())!._id);
    expect(await errorCode(t.query(api.campaigns.get, { sessionId, campaignId: screenId }))).toBe("NOT_FOUND");
  });

  test("[f05-campaign-list] card without session is refused", async () => {
    const { t, sessionId } = await seeded();
    const { _id } = await byName(t, sessionId, "Летняя акция");
    for (const bad of [crypto.randomUUID(), ""]) {
      expect(await errorCode(t.query(api.campaigns.get, { sessionId: bad, campaignId: _id }))).toBe("UNAUTHENTICATED");
    }
  });
});
