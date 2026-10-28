// f10-simulate-shows: «Смоделировать показы» (SoW 4.10). Reuses the locked rule through replaceShowLog (seed.ts).
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { requireActor } from "./lib/auth";
import { fail } from "./lib/errors";
import { campaignStatus } from "./lib/status";
import { addDays, kzNow } from "./lib/time";
import { replaceShowLog } from "./seed";

/** One run covers at most the last 31 days of the past part (team technical limit, design.md). */
export const SIMULATE_MAX_DAYS = 31;

// echo:no-rate-limit demo simulation; only a valid demo session reaches it.
export const simulate = mutation({
  args: { sessionId: v.string(), campaignId: v.id("campaigns") },
  returns: v.object({ rows: v.number(), from: v.string(), to: v.string() }),
  handler: async (ctx, { sessionId, campaignId }) => {
    await requireActor(ctx, sessionId);
    const c = await ctx.db.get(campaignId);
    if (!c) fail("NOT_FOUND", { entity: "campaign" });
    const today = kzNow(Date.now()).date;
    if (campaignStatus(c, today) === "planned") fail("CAMPAIGN_NOT_STARTED");
    const last = c.endDate < today ? c.endDate : today;
    const windowStart = addDays(last, -(SIMULATE_MAX_DAYS - 1));
    const from = c.startDate > windowStart ? c.startDate : windowStart;
    const screens: Doc<"screens">[] = [];
    for (const id of c.screenIds) {
      const s = await ctx.db.get(id);
      if (s) screens.push(s);
    }
    // The clipped copy keeps _id, so the delete by campaign and the hash factor stay the same.
    const rows = await replaceShowLog(ctx, { ...c, startDate: from }, screens, Date.now());
    return { rows, from, to: last };
  },
});
