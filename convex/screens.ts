// Screen queries (design D7). Feature changes add their own functions here; each calls requireActor first (D3).
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { city, screenStatus } from "./schema";
import { audienceDay } from "./lib/analytics";
import { requireActor } from "./lib/auth";
import { fail } from "./lib/errors";
import { hourSlots, occupancy } from "./lib/slots";
import { campaignStatus } from "./lib/status";
import { addDays, datesInRange, kzNow } from "./lib/time";

export const options = query({
  args: { sessionId: v.string() },
  returns: v.array(v.object({ _id: v.id("screens"), code: v.string(), name: v.string(), city, status: screenStatus })),
  handler: async (ctx, { sessionId }) => {
    await requireActor(ctx, sessionId);
    // shortcut: screens are written only by the seed (100 rows); add pagination if the network becomes real data.
    const screens = await ctx.db.query("screens").withIndex("by_code").collect();
    return screens.map(({ _id, code, name, city, status }) => ({ _id, code, name, city, status }));
  },
});

const LIST_DAYS = 7; // team default G-3: the last 7 days up to today (UTC+5)
const SEARCH_MAX = 100;

/** Today and the 7-day window of the list and the card. */
function period() {
  const today = kzNow(Date.now()).date;
  return { today, from: addDays(today, -(LIST_DAYS - 1)), to: today };
}

// shortcut: campaigns have no index (~15 rows, ADR-0004 scan); add one if campaigns become real data.
const allCampaigns = (ctx: QueryCtx) => ctx.db.query("campaigns").collect();

const isPercent = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n >= 0 && n <= 100);

export const list = query({
  args: {
    sessionId: v.string(),
    city: v.optional(city),
    status: v.optional(screenStatus),
    camera: v.optional(v.boolean()),
    occupancyMin: v.optional(v.number()),
    occupancyMax: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  returns: v.object({
    from: v.string(),
    to: v.string(),
    rows: v.array(
      v.object({
        _id: v.id("screens"),
        code: v.string(),
        name: v.string(),
        city,
        address: v.string(),
        lat: v.number(),
        lng: v.number(),
        status: screenStatus,
        workStartHour: v.number(),
        workEndHour: v.number(),
        imageKey: v.string(),
        hasCamera: v.boolean(),
        occupancyPercent: v.number(),
        activeCampaigns: v.number(),
        audience: v.union(v.number(), v.null()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionId);
    const { occupancyMin: min, occupancyMax: max } = args;
    if (!isPercent(min) || !isPercent(max) || (min !== undefined && max !== undefined && min > max)) {
      fail("INVALID_INPUT", { field: "occupancy" });
    }
    if (args.search !== undefined && args.search.length > SEARCH_MAX) fail("INVALID_INPUT", { field: "search" });
    const search = args.search?.trim().toLowerCase() ?? "";

    const { today, from, to } = period();
    const days = datesInRange(from, to);
    const campaigns = await allCampaigns(ctx);
    // shortcut: screens are written only by the seed (100 rows); add pagination if the network becomes real data.
    const screens = await ctx.db.query("screens").withIndex("by_code").collect();
    const rows = screens.map((s) => ({
      _id: s._id,
      code: s.code,
      name: s.name,
      city: s.city,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      workStartHour: s.workStartHour,
      workEndHour: s.workEndHour,
      imageKey: s.imageKey,
      hasCamera: s.hasCamera,
      occupancyPercent: occupancy([s], campaigns, from, to).percent,
      activeCampaigns: campaigns.filter((c) => c.screenIds.includes(s._id) && campaignStatus(c, today) === "active").length,
      audience: s.hasCamera ? days.reduce((sum, d) => sum + audienceDay(s, d)!.people, 0) : null,
    }));
    return {
      from,
      to,
      rows: rows.filter(
        (r) =>
          (args.city === undefined || r.city === args.city) &&
          (args.status === undefined || r.status === args.status) &&
          (args.camera === undefined || r.hasCamera === args.camera) &&
          (min === undefined || r.occupancyPercent >= min) &&
          (max === undefined || r.occupancyPercent <= max) &&
          (search === "" || [r.name, r.code, r.address].some((f) => f.toLowerCase().includes(search))),
      ),
    };
  },
});

export const get = query({
  args: { sessionId: v.string(), screenId: v.string() },
  returns: v.object({
    today: v.string(),
    from: v.string(),
    to: v.string(),
    screen: v.object({
      _id: v.id("screens"),
      code: v.string(),
      name: v.string(),
      city,
      address: v.string(),
      lat: v.number(),
      lng: v.number(),
      status: screenStatus,
      workStartHour: v.number(),
      workEndHour: v.number(),
      imageKey: v.string(),
      hasCamera: v.boolean(),
      hasVehicleMetric: v.boolean(),
    }),
    occupancyTodayPercent: v.number(),
    campaigns: v.array(
      v.object({
        _id: v.id("campaigns"),
        name: v.string(),
        advertiser: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        startHour: v.number(),
        endHour: v.number(),
        slotsPerCycle: v.number(),
        status: v.union(v.literal("planned"), v.literal("active"), v.literal("finished")),
      }),
    ),
    hours: v.array(
      v.object({
        hour: v.number(),
        used: v.number(),
        campaigns: v.array(v.object({ _id: v.id("campaigns"), name: v.string() })),
      }),
    ),
    audience: v.union(v.object({ people: v.number(), looks: v.number(), vehicles: v.union(v.number(), v.null()) }), v.null()),
    events: v.array(v.object({ at: v.number(), kind: v.union(v.literal("went_offline"), v.literal("back_online")) })),
  }),
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionId);
    // string arg + normalizeId: a malformed or stale (pre-reset) URL id gives NOT_FOUND, not a validator error.
    const id = ctx.db.normalizeId("screens", args.screenId);
    const s = id && (await ctx.db.get(id));
    if (!s) fail("NOT_FOUND", { entity: "screens" });

    const { today, from, to } = period();
    const campaigns = await allCampaigns(ctx);

    const hours = [];
    for (let hour = s.workStartHour; hour < s.workEndHour; hour += 1) {
      const owners = new Map<Id<"campaigns">, string>();
      let used = 0;
      for (const slot of hourSlots(s, today, hour, campaigns)) {
        if (slot.campaignId === null) continue;
        used += 1;
        owners.set(slot.campaignId, slot.campaignName!);
      }
      hours.push({ hour, used, campaigns: [...owners].map(([_id, name]) => ({ _id, name })) });
    }

    let audience = null;
    if (s.hasCamera) {
      const days = datesInRange(from, to).map((d) => audienceDay(s, d)!);
      audience = {
        people: days.reduce((sum, a) => sum + a.people, 0),
        looks: days.reduce((sum, a) => sum + a.looks, 0),
        vehicles: s.hasVehicleMetric ? days.reduce((sum, a) => sum + a.vehicles!, 0) : null,
      };
    }

    const events = await ctx.db
      .query("screenEvents")
      .withIndex("by_screen", (q) => q.eq("screenId", s._id))
      .order("desc")
      .take(10);

    return {
      today,
      from,
      to,
      screen: {
        _id: s._id,
        code: s.code,
        name: s.name,
        city: s.city,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        status: s.status,
        workStartHour: s.workStartHour,
        workEndHour: s.workEndHour,
        imageKey: s.imageKey,
        hasCamera: s.hasCamera,
        hasVehicleMetric: s.hasVehicleMetric,
      },
      occupancyTodayPercent: occupancy([s], campaigns, today, today).percent,
      campaigns: campaigns
        .filter((c) => c.screenIds.includes(s._id))
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a._creationTime - b._creationTime)
        .map((c) => ({
          _id: c._id,
          name: c.name,
          advertiser: c.advertiser,
          startDate: c.startDate,
          endDate: c.endDate,
          startHour: c.startHour,
          endHour: c.endHour,
          slotsPerCycle: c.slotsPerCycle,
          status: campaignStatus(c, today),
        })),
      hours,
      audience,
      events: events.map(({ at, kind }) => ({ at, kind })),
    };
  },
});
