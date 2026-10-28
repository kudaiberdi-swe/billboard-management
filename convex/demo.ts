// Demo access, seed and reset (design D3, D3a, D7; ADR-0003, ADR-0006).
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { requireActor } from "./lib/auth";
import { SESSION_DAYS } from "./lib/config";
import { fail } from "./lib/errors";
import { kzNow } from "./lib/time";
import { enforceRateLimit, normalizeKey, rateLimiter } from "./rateLimits";
import { seedData } from "./seed";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PASSWORD = 200;
const MIN_ENV_PASSWORD = 24;
const DOMAIN_TABLES = ["screenEvents", "campaigns", "screens"] as const;
// showLog rows deleted per transaction, far below the Convex per-transaction write limit with the ~1 000 seed writes.
export const RESET_LOG_BATCH = 4000;

/** Deletes up to RESET_LOG_BATCH log rows of these campaigns; schedules purgeShowLog for the rest. */
async function deleteShowLog(ctx: MutationCtx, campaignIds: Id<"campaigns">[]): Promise<void> {
  const left = [...campaignIds];
  let budget = RESET_LOG_BATCH;
  while (left.length > 0 && budget > 0) {
    const rows = await ctx.db
      .query("showLog")
      .withIndex("by_campaign", (q) => q.eq("campaignId", left[0]))
      .take(budget);
    for (const row of rows) await ctx.db.delete(row._id);
    budget -= rows.length;
    if (budget > 0) left.shift(); // a full page may leave rows of left[0]: the next run reads it again
  }
  if (left.length > 0) await ctx.scheduler.runAfter(0, internal.demo.purgeShowLog, { campaignIds: left });
}

/** Constant-time compare: the time depends only on the lengths, never on where the strings differ. */
function sameText(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// fde-echo:public the password check is the guard of sign-in (ADR-0003); rate-limited per session and globally (D3a).
export const signIn = mutation({
  args: { sessionId: v.string(), password: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true) }),
    v.object({ ok: v.literal(false), code: v.literal("WRONG_PASSWORD") }),
  ),
  handler: async (ctx, { sessionId, password }) => {
    if (!UUID.test(sessionId)) fail("INVALID_INPUT", { field: "sessionId" });
    await enforceRateLimit(ctx, "signIn", sessionId);
    const expected = process.env.DEMO_PASSWORD ?? "";
    // Unset, empty or short env never matches; the password is never logged or returned (length only).
    if (expected.length < MIN_ENV_PASSWORD) {
      if (expected !== "") console.error(`DEMO_PASSWORD shorter than ${MIN_ENV_PASSWORD} chars: sign-in disabled`);
      return { ok: false as const, code: "WRONG_PASSWORD" as const };
    }
    if (password.length > MAX_PASSWORD || !sameText(password, expected)) {
      return { ok: false as const, code: "WRONG_PASSWORD" as const };
    }
    const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
    const session = await ctx.db
      .query("demoSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (session) await ctx.db.patch(session._id, { expiresAt });
    else await ctx.db.insert("demoSessions", { sessionId, expiresAt });
    await rateLimiter.reset(ctx, "signInPerAccount", { key: normalizeKey(sessionId) });
    return { ok: true as const };
  },
});

export const sessionStatus = query({
  args: { sessionId: v.string() },
  returns: v.object({ valid: v.boolean() }),
  handler: async (ctx, { sessionId }) => {
    try {
      await requireActor(ctx, sessionId);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  },
});

// echo:no-rate-limit demo data reset, not a password reset; only a valid demo session reaches it.
export const reset = mutation({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId }) => {
    await requireActor(ctx, sessionId);
    const campaigns = await ctx.db.query("campaigns").collect(); // ≤ 200 (campaigns.create cap)
    for (const c of campaigns) {
      if (c.creative.kind === "video") await ctx.storage.delete(c.creative.storageId);
    }
    // Old log rows go in bounded pages; rows left for purgeShowLog point at deleted campaigns and screens,
    // so no reader counts them (readers go by the new campaign or screen ids).
    await deleteShowLog(ctx, campaigns.map((c) => c._id));
    for (const table of DOMAIN_TABLES) {
      for (const row of await ctx.db.query(table).collect()) await ctx.db.delete(row._id);
    }
    await seedData(ctx, kzNow(Date.now()).date);
    return null;
  },
});

/** Continues the log delete of demo.reset in bounded pages until the deleted campaigns have no rows. */
export const purgeShowLog = internalMutation({
  args: { campaignIds: v.array(v.id("campaigns")) },
  returns: v.null(),
  handler: async (ctx, { campaignIds }) => {
    await deleteShowLog(ctx, campaignIds);
    return null;
  },
});

export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if ((await ctx.db.query("screens").first()) !== null) return null;
    await seedData(ctx, kzNow(Date.now()).date);
    return null;
  },
});

export const clearSessions = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const rows = await ctx.db.query("demoSessions").collect(); // shortcut: one row per viewer browser; paginate if it grows past a few thousand
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});
