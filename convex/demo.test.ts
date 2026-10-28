/// <reference types="vite/client" />
// demo-access (guard, sessions), demo-data (seed, reset), the base Convex functions and the seed-backed scenarios.
// Single role and one shared data set (D-13): IDOR between users of the same role does not apply.
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { ConvexError } from "convex/values";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { audienceDay, audienceHour } from "./lib/analytics";
import { CITIES, PLACEHOLDER_KEYS, SLOTS_PER_CYCLE } from "./lib/config";
import { hourSlots, isOn, occupancy, plannedShowsForDay, usedSlots } from "./lib/slots";
import { campaignStatus, notifications } from "./lib/status";
import { addDays, kzNow } from "./lib/time";
import { seedClock, seedData } from "./seed";

const modules = import.meta.glob("./**/*.*s");
const PASSWORD = "synthetic-demo-password-for-tests";
const TODAYS = ["2026-10-31", "2027-01-01", "2028-02-29"];

function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}
type T = ReturnType<typeof setup>;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function signedIn(t: T, sessionId: string = crypto.randomUUID()) {
  vi.stubEnv("DEMO_PASSWORD", PASSWORD);
  expect(await t.mutation(api.demo.signIn, { sessionId, password: PASSWORD })).toEqual({ ok: true });
  return sessionId;
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

type State = {
  screens: Doc<"screens">[];
  campaigns: Doc<"campaigns">[];
  showLog: Doc<"showLog">[];
  screenEvents: Doc<"screenEvents">[];
};
const load = (t: T): Promise<State> =>
  t.run(async (ctx) => ({
    screens: await ctx.db.query("screens").collect(),
    campaigns: await ctx.db.query("campaigns").collect(),
    showLog: await ctx.db.query("showLog").collect(),
    screenEvents: await ctx.db.query("screenEvents").collect(),
  }));
const tableCounts = async (t: T) => Object.values(await load(t)).map((rows) => rows.length);

// One checker per seed scenario: run for 3 seed days, and again after a reset.
const SEED_CHECKS: Record<string, (s: State, today: string) => void> = {
  "seed has 100 screens in 4 regions": ({ screens }) => {
    expect(screens).toHaveLength(100);
    for (const city of CITIES) expect(screens.some((s) => s.city === city)).toBe(true);
    expect(new Set(screens.map((s) => s.code)).size).toBe(100);
  },
  "seed has offline and camera screens": ({ screens }) => {
    const offline = screens.filter((s) => s.status === "offline").length;
    expect(offline).toBeGreaterThanOrEqual(1);
    expect(screens.length - offline).toBeGreaterThan(50);
    const cameras = screens.filter((s) => s.hasCamera).length;
    expect(cameras).toBeGreaterThan(50);
    expect(cameras).toBeLessThan(100);
    const vehicles = screens.filter((s) => s.hasVehicleMetric).length;
    expect(vehicles).toBeGreaterThanOrEqual(40);
    expect(vehicles).toBeLessThanOrEqual(60);
  },
  "seed working hours": ({ screens }) => {
    expect(screens.filter((s) => s.workStartHour === 7 && s.workEndHour === 23).length).toBeGreaterThan(50);
    expect(screens.some((s) => s.workStartHour === 0 && s.workEndHour === 24)).toBe(true);
  },
  "seed has the named campaigns": ({ campaigns }, today) => {
    const status = (name: string, advertiser: string) => {
      const c = campaigns.find((c) => c.name === name && c.advertiser === advertiser);
      return c && campaignStatus(c, today);
    };
    expect(status("Летняя акция", "Demo Cola")).toBe("active");
    expect(status("Открытие магазина", "Demo Market")).toBe("active");
    expect(status("Презентация автомобиля", "Demo Auto")).toBe("planned");
  },
  "seed has every campaign status": ({ campaigns }, today) => {
    expect(new Set(campaigns.map((c) => campaignStatus(c, today)))).toEqual(new Set(["planned", "active", "finished"]));
  },
  "seed schedules have occupied and free slots": ({ screens, campaigns }, today) => {
    for (const s of screens) {
      for (const c of campaigns.filter((c) => c.screenIds.includes(s._id))) {
        for (let d = c.startDate; d <= c.endDate; d = addDays(d, 1)) {
          for (let h = c.startHour; h < c.endHour; h += 1) expect(usedSlots(s, d, h, campaigns)).toBeLessThanOrEqual(SLOTS_PER_CYCLE);
        }
      }
    }
    const used = screens.flatMap((s) => Array.from({ length: 24 }, (_, h) => usedSlots(s, today, h, campaigns)));
    expect(used.some((n) => n > 0)).toBe(true);
    const free = screens.flatMap((s) =>
      Array.from({ length: s.workEndHour - s.workStartHour }, (_, i) => hourSlots(s, today, s.workStartHour + i, campaigns)),
    );
    expect(free.some((slots) => slots.some((slot) => slot.campaignId === null))).toBe(true);
  },
  "seed has a show log within plan": ({ screens, campaigns, showLog }, today) => {
    const now = kzNow(seedClock(today));
    const logged = campaigns.filter((c) => showLog.some((r) => r.campaignId === c._id));
    expect(logged.some((c) => campaignStatus(c, today) === "active")).toBe(true);
    for (const r of showLog) {
      const c = campaigns.find((c) => c._id === r.campaignId)!;
      const s = screens.find((s) => s._id === r.screenId)!;
      expect(s.status).toBe("online");
      expect(r.date >= c.startDate && r.date <= today).toBe(true);
      expect(r.shows).toBeLessThanOrEqual(plannedShowsForDay(c, s, r.date, r.date === today ? now.hour : undefined));
    }
  },
  "seed audience is available per hour": ({ screens }, today) => {
    for (const s of screens.filter((s) => s.hasCamera)) {
      for (let h = 0; h < 24; h += 1) expect(audienceHour(s, today, h)).not.toBeNull();
    }
  },
  "seed has notifications of both kinds": ({ screens, campaigns }, today) => {
    const kinds = notifications(screens, campaigns, today).map((n) => n.kind);
    expect(kinds).toContain("screen_offline");
    expect(kinds).toContain("campaign_ending");
  },
  "seed has screen events": ({ screens, screenEvents }) => {
    for (const s of screens.filter((s) => s.status === "offline")) {
      expect(screenEvents.some((e) => e.screenId === s._id && e.kind === "went_offline")).toBe(true);
    }
  },
  "seed has only Demo advertisers": ({ screens, campaigns }) => {
    for (const c of campaigns) expect(c.advertiser.startsWith("Demo ")).toBe(true);
    // Ids and the creation time are system values, not text a person could be named in.
    const text = JSON.stringify([...screens, ...campaigns].map(({ _id, _creationTime, ...rest }) => ({ ...rest, screenIds: undefined })));
    expect(text).not.toMatch(/@/); // no email
    expect(text).not.toMatch(/(\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/); // no KZ phone number
  },
  "hour slots agree with the screen campaigns": ({ screens, campaigns }, today) => {
    for (const s of screens) {
      for (const date of [addDays(today, -1), today, addDays(today, 10)]) {
        for (let h = 0; h < 24; h += 1) {
          const ids = new Set(hourSlots(s, date, h, campaigns).map((slot) => slot.campaignId).filter((id) => id !== null));
          for (const id of ids) expect(campaigns.find((c) => c._id === id)!.screenIds).toContain(s._id);
          for (const c of campaigns.filter((c) => isOn(c, s, date, h))) expect(ids.has(c._id)).toBe(true);
        }
      }
    }
  },
};

describe("seed", () => {
  const states = new Map<string, State>();
  beforeAll(async () => {
    for (const today of TODAYS) {
      const t = setup();
      await t.run((ctx) => seedData(ctx, today));
      states.set(today, await load(t));
    }
  });

  const forEachDay = (name: string) => () => {
    for (const today of TODAYS) SEED_CHECKS[name](states.get(today)!, today);
  };
  // Literal titles: check-scenarios reads them from the source.
  test("[base-contract] seed has 100 screens in 4 regions", forEachDay("seed has 100 screens in 4 regions"));
  test("[base-contract] seed has offline and camera screens", forEachDay("seed has offline and camera screens"));
  test("[base-contract] seed working hours", forEachDay("seed working hours"));
  test("[base-contract] seed has the named campaigns", forEachDay("seed has the named campaigns"));
  test("[base-contract] seed has every campaign status", forEachDay("seed has every campaign status"));
  test("[base-contract] seed schedules have occupied and free slots", forEachDay("seed schedules have occupied and free slots"));
  test("[base-contract] seed has a show log within plan", forEachDay("seed has a show log within plan"));
  test("[base-contract] seed audience is available per hour", forEachDay("seed audience is available per hour"));
  test("[base-contract] seed has notifications of both kinds", forEachDay("seed has notifications of both kinds"));
  test("[base-contract] seed has screen events", forEachDay("seed has screen events"));
  test("[base-contract] seed has only Demo advertisers", forEachDay("seed has only Demo advertisers"));
  test("[base-contract] hour slots agree with the screen campaigns", forEachDay("hour slots agree with the screen campaigns"));

  test("[base-contract] seed runs only on an empty deployment", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    const before = await load(t);
    expect(before.screens).toHaveLength(100);
    await t.mutation(internal.demo.seed, {});
    expect(await load(t)).toEqual(before);
  });

  test("seeded images exist under public/demo", () => {
    const files = Object.keys(import.meta.glob("/public/demo/**/*.svg")).map((p) => p.replace(/^.*\/public\/demo\//, ""));
    for (const key of PLACEHOLDER_KEYS) expect(files).toContain(`creatives/${key}.svg`);
    for (const key of new Set(states.get(TODAYS[0])!.screens.map((s) => s.imageKey))) expect(files).toContain(`screens/${key}.svg`);
  });

  test("audience and occupancy for 100 screens × 366 days run under 500 ms", () => {
    const { screens, campaigns } = states.get(TODAYS[0])!;
    const from = TODAYS[0];
    const to = addDays(from, 365);
    const start = performance.now();
    for (const s of screens) for (let d = from; d <= to; d = addDays(d, 1)) audienceDay(s, d);
    const occ = occupancy(screens, campaigns, from, to);
    expect(performance.now() - start).toBeLessThan(500);
    expect(occ.byDay).toHaveLength(366);
  });
});

describe("demo-access", () => {
  test("[base-contract] correct password creates a session", async () => {
    const t = setup();
    const sessionId = await signedIn(t);
    expect(await t.query(api.demo.sessionStatus, { sessionId })).toEqual({ valid: true });
  });

  test("[base-contract] wrong password creates no session", async () => {
    const t = setup();
    vi.stubEnv("DEMO_PASSWORD", PASSWORD);
    const sessionId = crypto.randomUUID();
    expect(await t.mutation(api.demo.signIn, { sessionId, password: "wrong" })).toEqual({ ok: false, code: "WRONG_PASSWORD" });
    expect(await t.mutation(api.demo.signIn, { sessionId, password: `${PASSWORD}x` })).toEqual({ ok: false, code: "WRONG_PASSWORD" });
    expect(await t.query(api.demo.sessionStatus, { sessionId })).toEqual({ valid: false });
  });

  test("[base-contract] missing env password never signs in", async () => {
    const t = setup();
    const short = "x".repeat(23);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const env of [undefined, "", short]) {
      vi.stubEnv("DEMO_PASSWORD", env);
      for (const password of ["", "anything", short]) {
        const sessionId = crypto.randomUUID();
        expect(await t.mutation(api.demo.signIn, { sessionId, password })).toEqual({ ok: false, code: "WRONG_PASSWORD" });
      }
    }
    expect(log).toHaveBeenCalledWith("DEMO_PASSWORD shorter than 24 chars: sign-in disabled");
    expect(log.mock.calls.flat().join(" ")).not.toContain(short);
    log.mockRestore();
    expect((await load(t)).screens).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("demoSessions").collect())).toEqual([]);
  });

  test("[base-contract] malformed session id is rejected", async () => {
    const t = setup();
    vi.stubEnv("DEMO_PASSWORD", PASSWORD);
    for (const sessionId of ["", "abc", `${crypto.randomUUID()}0`, "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"]) {
      expect(await errorCode(t.mutation(api.demo.signIn, { sessionId, password: PASSWORD }))).toBe("INVALID_INPUT");
    }
    expect(await t.run((ctx) => ctx.db.query("demoSessions").collect())).toEqual([]);
  });

  test("[base-contract] session expires after 7 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse("2026-10-31T06:00:00Z"));
    const t = setup();
    const sessionId = await signedIn(t);
    vi.setSystemTime(Date.parse("2026-11-07T05:59:59Z"));
    expect(await t.query(api.demo.sessionStatus, { sessionId })).toEqual({ valid: true });
    vi.setSystemTime(Date.parse("2026-11-07T06:00:00Z"));
    expect(await t.query(api.demo.sessionStatus, { sessionId })).toEqual({ valid: false });
    expect(await errorCode(t.query(api.screens.options, { sessionId }))).toBe("UNAUTHENTICATED");
  });

  test("[base-contract] signing in again extends the session", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse("2026-10-31T06:00:00Z"));
    const t = setup();
    const sessionId = await signedIn(t);
    const second = Date.parse("2026-11-03T06:00:00Z");
    vi.setSystemTime(second);
    await signedIn(t, sessionId);
    const rows = await t.run((ctx) => ctx.db.query("demoSessions").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].expiresAt).toBe(second + 7 * 86_400_000);
  });

  test("[base-contract] guarded query without a session", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    for (const sessionId of [crypto.randomUUID(), "", "not-a-session"]) {
      expect(await errorCode(t.query(api.screens.options, { sessionId }))).toBe("UNAUTHENTICATED");
    }
  });

  test("[base-contract] guarded mutation without a session", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    const before = await load(t);
    expect(await errorCode(t.mutation(api.demo.reset, { sessionId: crypto.randomUUID() }))).toBe("UNAUTHENTICATED");
    expect(await load(t)).toEqual(before);
  });

  test("[base-contract] guarded call with a valid session", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    const options = await t.query(api.screens.options, { sessionId: await signedIn(t) });
    expect(options).toHaveLength(100);
    expect(options.map((o) => o.code)).toEqual([...options.map((o) => o.code)].sort());
    expect(Object.keys(options[0]).sort()).toEqual(["_id", "city", "code", "name", "status"]);
  });

  test("[base-contract] session status reveals no data", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    for (const sessionId of [await signedIn(t), crypto.randomUUID(), "x", ""]) {
      expect(Object.keys(await t.query(api.demo.sessionStatus, { sessionId }))).toEqual(["valid"]);
    }
  });

  test("[base-contract] clear sessions signs everyone out", async () => {
    const t = setup();
    const ids = [await signedIn(t), await signedIn(t)];
    expect(await t.mutation(internal.demo.clearSessions, {})).toBe(2);
    for (const sessionId of ids) expect(await t.query(api.demo.sessionStatus, { sessionId })).toEqual({ valid: false });
  });

  test("[base-contract] clear sessions is not public", async () => {
    const demo = await import("./demo");
    for (const fn of [demo.clearSessions, demo.seed]) {
      expect((fn as unknown as { isInternal: boolean }).isInternal).toBe(true);
      expect((fn as unknown as { isPublic?: boolean }).isPublic).toBeFalsy();
    }
  });
});

describe("statuses guard", () => {
  test("[base-contract] no status argument", async () => {
    const sources = import.meta.glob(["./*.ts", "!./*.test.ts", "!./schema.ts", "!./convex.config.ts"], { eager: true });
    let publicFns = 0;
    for (const [path, mod] of Object.entries(sources)) {
      for (const [name, fn] of Object.entries(mod as Record<string, unknown>)) {
        const f = fn as { isPublic?: boolean; exportArgs?: () => string };
        if (!f?.isPublic || !f.exportArgs) continue;
        publicFns += 1;
        expect(Object.keys(JSON.parse(f.exportArgs()).value), `${path} ${name}`).not.toContain("status");
      }
    }
    expect(publicFns).toBeGreaterThanOrEqual(4);
    const t = setup();
    const sessionId = await signedIn(t);
    await expect(t.query(api.screens.options, { sessionId, status: "active" } as never)).rejects.toThrow(/status/);
  });
});

describe("reset", () => {
  async function withUserCampaign(t: T) {
    await t.mutation(internal.demo.seed, {});
    return t.run(async (ctx) => {
      const screen = (await ctx.db.query("screens").first())!;
      const storageId = await ctx.storage.store(new Blob(["synthetic video bytes"], { type: "video/mp4" }));
      const campaignId = await ctx.db.insert("campaigns", {
        name: "Пользовательская кампания", advertiser: "Demo User", startDate: "2026-11-01", endDate: "2026-11-02",
        startHour: 8, endHour: 9, slotsPerCycle: 1, screenIds: [screen._id], creative: { kind: "video", storageId },
      });
      return { campaignId, storageId };
    });
  }

  test("[base-contract] reset deletes user campaigns and restores the seed", async () => {
    const t = setup();
    const { campaignId } = await withUserCampaign(t);
    await t.mutation(api.demo.reset, { sessionId: await signedIn(t) });
    const state = await load(t);
    expect(state.campaigns.some((c) => c._id === campaignId || c.name === "Пользовательская кампания")).toBe(false);
    const today = kzNow(Date.now()).date;
    for (const check of Object.values(SEED_CHECKS)) check(state, today);
  });

  test("[base-contract] reset deletes uploaded videos", async () => {
    const t = setup();
    const { storageId } = await withUserCampaign(t);
    await t.mutation(api.demo.reset, { sessionId: await signedIn(t) });
    expect(await t.run((ctx) => ctx.db.system.get(storageId))).toBeNull();
  });

  test("[base-contract] reset keeps viewers signed in", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    const a = await signedIn(t);
    const b = await signedIn(t);
    await t.mutation(api.demo.reset, { sessionId: a });
    for (const sessionId of [a, b]) expect(await t.query(api.demo.sessionStatus, { sessionId })).toEqual({ valid: true });
  });

  test("[base-contract] reset without a session", async () => {
    const t = setup();
    const { campaignId } = await withUserCampaign(t);
    vi.useFakeTimers({ toFake: ["Date"] });
    const expired = await signedIn(t);
    vi.setSystemTime(Date.now() + 7 * 86_400_000);
    const counts = await tableCounts(t);
    for (const sessionId of [crypto.randomUUID(), "", "x", expired]) {
      expect(await errorCode(t.mutation(api.demo.reset, { sessionId }))).toBe("UNAUTHENTICATED");
    }
    expect(await t.run((ctx) => ctx.db.get(campaignId))).not.toBeNull();
    expect(await tableCounts(t)).toEqual(counts);
  });

  test("[base-contract] data is shared between sessions", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    await signedIn(t); // viewer A
    const b = await signedIn(t);
    const added = await withUserCampaign(t);
    // Viewer B reads the same rows: no function scopes data by session.
    const seen = await t.run((ctx) => ctx.db.get(added.campaignId));
    expect(seen?.name).toBe("Пользовательская кампания");
    expect(await t.query(api.screens.options, { sessionId: b })).toHaveLength(100);
  });
});

describe("show-log storage", () => {
  test("[base-contract] rerun replaces the log", async () => {
    const t = setup();
    const today = "2026-10-31";
    await t.run((ctx) => seedData(ctx, today));
    const { replaceShowLog } = await import("./seed");
    const counts = await t.run(async (ctx) => {
      const screens = await ctx.db.query("screens").collect();
      const c = (await ctx.db.query("campaigns").collect()).find((c) => c.name === "Летняя акция")!;
      const rows = async () => (await ctx.db.query("showLog").withIndex("by_campaign", (q) => q.eq("campaignId", c._id)).collect()).map(({ screenId, date, shows }) => ({ screenId, date, shows }));
      await replaceShowLog(ctx, c, screens, seedClock(today));
      const first = await rows();
      await replaceShowLog(ctx, c, screens, seedClock(today));
      return { first, second: await rows() };
    });
    expect(counts.first.length).toBeGreaterThan(0);
    expect(counts.second).toEqual(counts.first);
  });

  test("[base-contract] new campaign has no log", async () => {
    const t = setup();
    await t.mutation(internal.demo.seed, {});
    const rows = await t.run(async (ctx) => {
      const screen = (await ctx.db.query("screens").first())!;
      const campaignId = await ctx.db.insert("campaigns", {
        name: "Новая кампания", advertiser: "Demo New", startDate: "2026-01-01", endDate: "2026-12-31",
        startHour: 8, endHour: 20, slotsPerCycle: 2, screenIds: [screen._id], creative: { kind: "placeholder", key: "placeholder-1" },
      });
      return ctx.db.query("showLog").withIndex("by_campaign", (q) => q.eq("campaignId", campaignId)).collect();
    });
    expect(rows.reduce((sum, r) => sum + r.shows, 0)).toBe(0);
  });
});
