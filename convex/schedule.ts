// «Расписание» (f07-schedule): one screen and day, slots only from the shared hourSlots (slot-model).
import { v } from "convex/values";
import { query } from "./_generated/server";
import { city, screenStatus } from "./schema";
import { requireActor } from "./lib/auth";
import { fail } from "./lib/errors";
import { hourSlots } from "./lib/slots";
import { requireDate } from "./lib/time";

const slot = v.object({
  index: v.number(),
  startSec: v.number(),
  endSec: v.number(),
  campaignId: v.union(v.id("campaigns"), v.null()),
  campaignName: v.union(v.string(), v.null()),
});

export const day = query({
  args: { sessionId: v.string(), screenId: v.string(), date: v.string() },
  returns: v.object({
    screen: v.object({
      _id: v.id("screens"),
      code: v.string(),
      name: v.string(),
      city,
      status: screenStatus,
      workStartHour: v.number(),
      workEndHour: v.number(),
    }),
    date: v.string(),
    hours: v.array(v.object({ hour: v.number(), used: v.number(), slots: v.array(slot) })),
  }),
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionId);
    const date = requireDate(args.date, "date");
    // string arg: a stale or malformed URL id gives NOT_FOUND, not a validator error
    const id = ctx.db.normalizeId("screens", args.screenId);
    const s = id && (await ctx.db.get(id));
    if (!s) fail("NOT_FOUND", { entity: "screens" });
    // shortcut: full campaigns scan (ADR-0004), fine for the demo's tens of campaigns; index by screen if it grows.
    const campaigns = await ctx.db.query("campaigns").collect();
    const hours = [];
    for (let hour = s.workStartHour; hour < s.workEndHour; hour += 1) {
      const slots = hourSlots(s, date, hour, campaigns);
      hours.push({ hour, used: slots.filter((x) => x.campaignId !== null).length, slots });
    }
    const { _id, code, name, city, status, workStartHour, workEndHour } = s;
    return { screen: { _id, code, name, city, status, workStartHour, workEndHour }, date, hours };
  },
});
