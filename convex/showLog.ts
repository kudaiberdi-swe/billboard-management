// f10-simulate-shows: «Смоделировать показы» (SoW 4.10). Reuses the locked rule through replaceShowLog (seed.ts).
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { requireActor } from "./lib/auth";
import { fail } from "./lib/errors";
import { campaignStatus } from "./lib/status";
import { addDays, diffDays, kzNow } from "./lib/time";
import { replaceShowLog } from "./seed";

/** One run covers at most the last 31 days of the past part (team technical limit, design.md). */
export const SIMULATE_MAX_DAYS = 31;

/**
 * KI-04: all simulated log rows together stay at or under this, so campaigns.list (every campaign's whole log) and
 * the unfiltered «Главная» read them in one query under the Convex limit of 32 000 documents read per function.
 * shortcut: a row budget instead of stored totals (schema change); store per-campaign totals if the log must grow.
 */
export const LOG_ROW_BUDGET = 20_000;

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
    let from = c.startDate > windowStart ? c.startDate : windowStart;
    const screens: Doc<"screens">[] = [];
    for (const id of c.screenIds) {
      const s = await ctx.db.get(id);
      if (s) screens.push(s);
    }
    // KI-04: the run writes one row per online screen and day; when the other campaigns' rows leave less room
    // than that, it keeps the latest days that fit, and the result reports the shorter window.
    const perDay = screens.filter((s) => s.status === "online").length;
    // + this campaign's own old rows (≤ 100 screens × 31 days), so a full table never undercounts the others.
    const scan = await ctx.db.query("showLog").take(LOG_ROW_BUDGET + 100 * SIMULATE_MAX_DAYS + 1);
    const others = scan.filter((r) => r.campaignId !== c._id).length;
    const fit = perDay === 0 ? Infinity : Math.floor((LOG_ROW_BUDGET - others) / perDay);
    if (fit < 1) fail("INVALID_INPUT", { field: "campaignId" });
    if (diffDays(from, last) + 1 > fit) from = addDays(last, -(fit - 1));
    // The clipped copy keeps _id, so the delete by campaign and the hash factor stay the same.
    const rows = await replaceShowLog(ctx, { ...c, startDate: from }, screens, Date.now());
    return { rows, from, to: last };
  },
});
