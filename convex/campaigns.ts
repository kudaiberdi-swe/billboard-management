// Campaign queries (design D7). Two owners, append-only with distinct names: f05 (list, get), f06 (check, create, upload).
import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { city, screenStatus } from "./schema";
import { requireActor } from "./lib/auth";
import { CITIES } from "./lib/config";
import { fail } from "./lib/errors";
import { plannedShows } from "./lib/slots";
import { campaignStatus as statusOf } from "./lib/status";
import { kzNow } from "./lib/time";

export const campaignStatus = v.union(v.literal("planned"), v.literal("active"), v.literal("finished"));

const summaryFields = {
  _id: v.id("campaigns"),
  name: v.string(),
  advertiser: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  status: campaignStatus,
  cities: v.array(city),
  plannedShows: v.number(),
  logShows: v.number(),
};

/** Status, cities, plan and log of one campaign; the per-screen parts feed the card. */
async function summary(ctx: QueryCtx, c: Doc<"campaigns">, screens: Doc<"screens">[], today: string) {
  const own = screens.filter((s) => c.screenIds.includes(s._id));
  const plan = plannedShows(c, own, c.startDate, c.endDate);
  // shortcut: reads the whole log of the campaign (≤ screens × days); store a total if the log outgrows the read limit.
  const log = await ctx.db
    .query("showLog")
    .withIndex("by_campaign", (q) => q.eq("campaignId", c._id))
    .collect();
  return {
    own,
    plan,
    log,
    fields: {
      _id: c._id,
      name: c.name,
      advertiser: c.advertiser,
      startDate: c.startDate,
      endDate: c.endDate,
      status: statusOf(c, today),
      cities: CITIES.filter((x) => own.some((s) => s.city === x)),
      plannedShows: plan.total,
      logShows: log.reduce((sum, r) => sum + r.shows, 0),
    },
  };
}

export const list = query({
  args: { sessionId: v.string() },
  returns: v.array(v.object({ ...summaryFields, screenCount: v.number() })),
  handler: async (ctx, { sessionId }) => {
    await requireActor(ctx, sessionId);
    const today = kzNow(Date.now()).date;
    // shortcut: ~10-15 campaigns and 100 screens (contract: no index, scan allowed); paginate if they become real data.
    const screens = await ctx.db.query("screens").withIndex("by_code").collect();
    const campaigns = await ctx.db.query("campaigns").order("desc").collect();
    return Promise.all(
      campaigns.map(async (c) => ({ ...(await summary(ctx, c, screens, today)).fields, screenCount: c.screenIds.length })),
    );
  },
});

export const get = query({
  args: { sessionId: v.string(), campaignId: v.string() },
  returns: v.object({
    ...summaryFields,
    startHour: v.number(),
    endHour: v.number(),
    slotsPerCycle: v.number(),
    creative: v.union(
      v.object({ kind: v.literal("placeholder"), key: v.string() }),
      v.object({ kind: v.literal("video"), url: v.union(v.string(), v.null()) }),
    ),
    screens: v.array(
      v.object({
        _id: v.id("screens"),
        code: v.string(),
        name: v.string(),
        city,
        status: screenStatus,
        plannedShows: v.number(),
        logShows: v.number(),
      }),
    ),
  }),
  handler: async (ctx, { sessionId, campaignId }) => {
    await requireActor(ctx, sessionId);
    const id = ctx.db.normalizeId("campaigns", campaignId);
    const c = id && (await ctx.db.get(id));
    if (!c) fail("NOT_FOUND", { entity: "campaign" });
    const screens = await ctx.db.query("screens").withIndex("by_code").collect();
    const { own, plan, log, fields } = await summary(ctx, c, screens, kzNow(Date.now()).date);
    return {
      ...fields,
      startHour: c.startHour,
      endHour: c.endHour,
      slotsPerCycle: c.slotsPerCycle,
      creative:
        c.creative.kind === "video"
          ? { kind: "video" as const, url: await ctx.storage.getUrl(c.creative.storageId) }
          : c.creative,
      screens: own.map((s, i) => ({
        _id: s._id,
        code: s.code,
        name: s.name,
        city: s.city,
        status: s.status,
        plannedShows: plan.byScreen[i].shows,
        logShows: log.filter((r) => r.screenId === s._id).reduce((sum, r) => sum + r.shows, 0),
      })),
    };
  },
});
