// «Главная» (f02-dashboard design): filtered network values and the network-wide in-app notifications. Read-only.
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { city } from "./schema";
import { requireActor } from "./lib/auth";
import { audienceDay } from "./lib/analytics";
import { CITIES, MAX_PERIOD_DAYS } from "./lib/config";
import { estimateContacts } from "./lib/contacts";
import { fail } from "./lib/errors";
import { occupancy, plannedShows } from "./lib/slots";
import { campaignStatus, notifications as notificationList } from "./lib/status";
import { datesInRange, diffDays, kzNow, requireDate } from "./lib/time";

export const summary = query({
  args: {
    sessionId: v.string(),
    from: v.string(),
    to: v.string(),
    city: v.optional(city),
    screenId: v.optional(v.id("screens")),
  },
  returns: v.object({
    screens: v.object({ total: v.number(), online: v.number(), offline: v.number() }),
    activeCampaigns: v.number(),
    occupancy: v.object({ percent: v.number(), occupied: v.number(), total: v.number() }),
    plannedShows: v.number(),
    logShows: v.number(),
    contacts: v.number(),
    looks: v.number(),
    occupancyByDay: v.array(v.object({ date: v.string(), percent: v.number() })),
    screensByCity: v.array(v.object({ city, count: v.number() })),
    activeList: v.array(
      v.object({ _id: v.id("campaigns"), name: v.string(), advertiser: v.string(), endDate: v.string() }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionId);
    const from = requireDate(args.from, "from");
    const to = requireDate(args.to, "to");
    if (from > to) fail("INVALID_INPUT", { field: "to" });
    if (diffDays(from, to) + 1 > MAX_PERIOD_DAYS) fail("INVALID_INPUT", { field: "period" });

    // shortcut: screens (100) and campaigns (~15) are small demo tables, read whole; paginate if they become real data.
    let sel: Doc<"screens">[];
    if (args.screenId) {
      const screen = await ctx.db.get(args.screenId);
      if (!screen) fail("NOT_FOUND", { entity: "screen" });
      sel = args.city && screen.city !== args.city ? [] : [screen];
    } else if (args.city) {
      const c = args.city;
      sel = await ctx.db.query("screens").withIndex("by_city", (q) => q.eq("city", c)).collect();
    } else {
      sel = await ctx.db.query("screens").withIndex("by_code").collect();
    }
    const campaigns = await ctx.db.query("campaigns").collect();
    const ids = new Set<string>(sel.map((s) => s._id));
    const today = kzNow(Date.now()).date;
    const onSel = campaigns.filter(
      (c) => c.startDate <= to && c.endDate >= from && c.screenIds.some((id) => ids.has(id)),
    );
    const active = onSel
      .filter((c) => campaignStatus(c, today) === "active")
      .sort((a, b) => a.endDate.localeCompare(b.endDate) || a.name.localeCompare(b.name));

    // shortcut: log rows of the period read in one query; fine at demo size, F-10 caps the simulated period.
    const log = await ctx.db
      .query("showLog")
      .withIndex("by_date", (q) => q.gte("date", from).lte("date", to))
      .collect();

    const occ = occupancy(sel, campaigns, from, to);
    const days = datesInRange(from, to);
    const online = sel.filter((s) => s.status === "online").length;
    let looks = 0;
    for (const s of sel) for (const d of days) looks += audienceDay(s, d)?.looks ?? 0;

    return {
      screens: { total: sel.length, online, offline: sel.length - online },
      activeCampaigns: active.length,
      occupancy: { percent: occ.percent, occupied: occ.occupied, total: occ.total },
      plannedShows: onSel.reduce((sum, c) => sum + plannedShows(c, sel, from, to).total, 0),
      logShows: log.reduce((sum, r) => (ids.has(r.screenId) ? sum + r.shows : sum), 0),
      contacts: onSel.reduce((sum, c) => sum + estimateContacts(c, sel, from, to).total, 0),
      looks,
      occupancyByDay: occ.byDay.map(({ date, percent }) => ({ date, percent })),
      screensByCity: CITIES.map((c) => ({ city: c, count: sel.filter((s) => s.city === c).length })),
      activeList: active.map(({ _id, name, advertiser, endDate }) => ({ _id, name, advertiser, endDate })),
    };
  },
});

export const notifications = query({
  args: { sessionId: v.string() },
  returns: v.array(
    v.object({
      kind: v.union(v.literal("screen_offline"), v.literal("campaign_ending")),
      refId: v.string(),
      name: v.string(),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    await requireActor(ctx, sessionId);
    // shortcut: whole demo tables (100 screens, ~15 campaigns); the list is network-wide by design, not filtered.
    const screens = await ctx.db.query("screens").withIndex("by_code").collect();
    const campaigns = await ctx.db.query("campaigns").collect();
    return notificationList(screens, campaigns, kzNow(Date.now()).date);
  },
});
