// «Отчёты» (f09-reports design): the report of one campaign, built from the locked lib math. Read-only.
// Block «Результаты размещения» (plan, log) and block «Аналитика экранов» (traffic, looks, contacts) stay separate.
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { campaignStatus } from "./campaigns";
import { city } from "./schema";
import { requireActor } from "./lib/auth";
import { audienceDay } from "./lib/analytics";
import { CITIES, MAX_PERIOD_DAYS } from "./lib/config";
import { estimateContacts } from "./lib/contacts";
import { fail } from "./lib/errors";
import { plannedShows } from "./lib/slots";
import { campaignStatus as statusOf } from "./lib/status";
import { datesInRange, diffDays, kzNow, requireDate } from "./lib/time";

const ref = { _id: v.id("screens"), code: v.string(), name: v.string(), city };
const completionOf = (planned: number, log: number) => (planned === 0 ? null : Math.round((log / planned) * 1000) / 10);

export const campaign = query({
  args: {
    sessionId: v.string(),
    campaignId: v.string(),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    city: v.optional(city),
    screenId: v.optional(v.string()),
  },
  returns: v.object({
    campaign: v.object({
      _id: v.id("campaigns"),
      name: v.string(),
      advertiser: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      status: campaignStatus,
    }),
    period: v.union(v.object({ from: v.string(), to: v.string() }), v.null()),
    options: v.object({ cities: v.array(city), screens: v.array(v.object(ref)) }),
    cities: v.array(city),
    screens: v.array(v.object(ref)),
    placement: v.object({
      plannedShows: v.number(),
      logShows: v.number(),
      completion: v.union(v.number(), v.null()),
      byDay: v.array(v.object({ date: v.string(), planned: v.number(), log: v.number() })),
      byScreen: v.array(
        v.object({ ...ref, planned: v.number(), log: v.number(), completion: v.union(v.number(), v.null()) }),
      ),
    }),
    screenAnalytics: v.object({
      traffic: v.number(),
      looks: v.number(),
      contacts: v.number(),
      screensWithoutCamera: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionId);
    const id = ctx.db.normalizeId("campaigns", args.campaignId);
    const c = id && (await ctx.db.get(id));
    if (!c) fail("NOT_FOUND", { entity: "campaign" });

    const from = args.from ? requireDate(args.from, "from") : c.startDate;
    const to = args.to ? requireDate(args.to, "to") : c.endDate;
    if (from > to || diffDays(from, to) + 1 > MAX_PERIOD_DAYS) fail("INVALID_INPUT", { field: "to" });

    const own = (await Promise.all(c.screenIds.map((s) => ctx.db.get(s))))
      .filter((s): s is Doc<"screens"> => s !== null)
      .sort((a, b) => a.code.localeCompare(b.code));
    if (args.screenId !== undefined) {
      const screenId = ctx.db.normalizeId("screens", args.screenId);
      if (!screenId || !c.screenIds.includes(screenId)) fail("INVALID_INPUT", { field: "screenId" });
    }
    const sel = own.filter((s) => (!args.city || s.city === args.city) && (!args.screenId || s._id === args.screenId));
    const refOf = (s: Doc<"screens">) => ({ _id: s._id, code: s.code, name: s.name, city: s.city });
    const citiesOf = (list: Doc<"screens">[]) => CITIES.filter((x) => list.some((s) => s.city === x));

    const start = from > c.startDate ? from : c.startDate;
    const end = to < c.endDate ? to : c.endDate;
    const period = start <= end ? { from: start, to: end } : null;

    const plan = plannedShows(c, sel, from, to);
    const ids = new Set<string>(sel.map((s) => s._id));
    const logByDay = new Map<string, number>();
    const logByScreen = new Map<string, number>();
    if (period) {
      // shortcut: the log of one campaign in the period (≤ 100 screens × 366 days); paginate if it outgrows the read limit.
      const rows = await ctx.db
        .query("showLog")
        .withIndex("by_campaign", (q) => q.eq("campaignId", c._id).gte("date", period.from).lte("date", period.to))
        .collect();
      for (const r of rows) {
        if (!ids.has(r.screenId)) continue;
        logByDay.set(r.date, (logByDay.get(r.date) ?? 0) + r.shows);
        logByScreen.set(r.screenId, (logByScreen.get(r.screenId) ?? 0) + r.shows);
      }
    }
    const logShows = [...logByDay.values()].reduce((a, n) => a + n, 0);

    let traffic = 0;
    let looks = 0;
    const days = period ? datesInRange(period.from, period.to) : [];
    for (const s of sel) {
      for (const d of days) {
        const a = audienceDay(s, d); // null without a camera: adds 0
        traffic += a?.people ?? 0;
        looks += a?.looks ?? 0;
      }
    }

    return {
      campaign: {
        _id: c._id,
        name: c.name,
        advertiser: c.advertiser,
        startDate: c.startDate,
        endDate: c.endDate,
        status: statusOf(c, kzNow(Date.now()).date),
      },
      period,
      options: { cities: citiesOf(own), screens: own.map(refOf) },
      cities: citiesOf(sel),
      screens: sel.map(refOf),
      placement: {
        plannedShows: plan.total,
        logShows,
        completion: completionOf(plan.total, logShows),
        byDay: plan.byDay.map(({ date, shows }) => ({ date, planned: shows, log: logByDay.get(date) ?? 0 })),
        byScreen: sel.map((s, i) => {
          const log = logByScreen.get(s._id) ?? 0;
          return { ...refOf(s), planned: plan.byScreen[i].shows, log, completion: completionOf(plan.byScreen[i].shows, log) };
        }),
      },
      screenAnalytics: {
        traffic,
        looks,
        contacts: estimateContacts(c, sel, from, to).total,
        screensWithoutCamera: sel.filter((s) => !s.hasCamera).length,
      },
    };
  },
});
