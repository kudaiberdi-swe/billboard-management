// «Аналитика аудитории» (f08-audience-analytics design): the simulated audience of one screen for a period. Read-only.
// All numbers come from the locked generator (lib/analytics); this module only sums them. No personal data exists.
import { v } from "convex/values";
import { query } from "./_generated/server";
import { city } from "./schema";
import { audienceHour, audienceProfile } from "./lib/analytics";
import { requireActor } from "./lib/auth";
import { MAX_PERIOD_DAYS } from "./lib/config";
import { fail } from "./lib/errors";
import { datesInRange, diffDays, requireDate } from "./lib/time";

export const screenPeriod = query({
  args: { sessionId: v.string(), screenId: v.string(), from: v.string(), to: v.string() },
  returns: v.object({
    screen: v.object({
      _id: v.id("screens"),
      code: v.string(),
      name: v.string(),
      city,
      hasCamera: v.boolean(),
      hasVehicleMetric: v.boolean(),
    }),
    audience: v.union(
      v.null(),
      v.object({
        people: v.number(),
        gazeEstimated: v.number(),
        looks: v.number(),
        vehicles: v.union(v.number(), v.null()),
        lookShare: v.number(),
        byHour: v.array(v.object({ hour: v.number(), people: v.number(), looks: v.number() })),
        profile: v.object({
          age: v.object({
            "18-24": v.number(),
            "25-34": v.number(),
            "35-44": v.number(),
            "45-54": v.number(),
            "55+": v.number(),
          }),
          gender: v.object({ male: v.number(), female: v.number() }),
        }),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionId);
    const from = requireDate(args.from, "from");
    const to = requireDate(args.to, "to");
    if (from > to) fail("INVALID_INPUT", { field: "to" });
    if (diffDays(from, to) + 1 > MAX_PERIOD_DAYS) fail("INVALID_INPUT", { field: "period" });
    // string arg: a stale or malformed URL id gives NOT_FOUND, not a validator error
    const id = ctx.db.normalizeId("screens", args.screenId);
    const s = id && (await ctx.db.get(id));
    if (!s) fail("NOT_FOUND", { entity: "screen" });

    const screen = {
      _id: s._id,
      code: s.code,
      name: s.name,
      city: s.city,
      hasCamera: s.hasCamera,
      hasVehicleMetric: s.hasVehicleMetric,
    };
    const profile = audienceProfile(s);
    if (!profile) return { screen, audience: null };

    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, people: 0, looks: 0 }));
    let people = 0;
    let gazeEstimated = 0;
    let looks = 0;
    let vehicles: number | null = null;
    for (const d of datesInRange(from, to)) {
      for (const point of byHour) {
        const a = audienceHour(s, d, point.hour)!; // non-null: the screen has a camera
        point.people += a.people;
        point.looks += a.looks;
        people += a.people;
        gazeEstimated += a.gazeEstimated;
        looks += a.looks;
        if (a.vehicles !== null) vehicles = (vehicles ?? 0) + a.vehicles;
      }
    }
    const lookShare = gazeEstimated === 0 ? 0 : Math.round((looks / gazeEstimated) * 1000) / 10;
    return { screen, audience: { people, gazeEstimated, looks, vehicles, lookShare, byHour, profile } };
  },
});
