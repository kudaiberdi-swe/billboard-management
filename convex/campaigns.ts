// Campaign functions. Shared by f05-campaign-list (list/get) and f06-campaign-create (below); append-only, distinct names.

// ---- f06-campaign-create: availability preview, conflict-safe create, video upload URL ----
import { v, type Infer } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { creative } from "./schema";
import { requireActor } from "./lib/auth";
import { MAX_PERIOD_DAYS, PLACEHOLDER_KEYS, SLOTS_PER_CYCLE, VIDEO_MAX_BYTES, VIDEO_TYPES } from "./lib/config";
import { fail } from "./lib/errors";
import { findConflicts, plannedShows, plannedShowsForDay, type CampaignRule } from "./lib/slots";
import { diffDays, requireDate } from "./lib/time";
import { enforceRateLimit } from "./rateLimits";

const MAX_CONFLICTS = 1000; // Convex arrays hold at most 8 192 items; design decision 4
const MAX_SCREENS = 100;
const MAX_TEXT = 200;

const requestFields = {
  startDate: v.string(),
  endDate: v.string(),
  startHour: v.number(),
  endHour: v.number(),
  slotsPerCycle: v.number(),
  screenIds: v.array(v.id("screens")),
};
const requestValidator = v.object(requestFields);
const requestArgs = { sessionId: v.string(), ...requestFields };

const conflict = v.object({
  screenId: v.id("screens"),
  date: v.string(),
  hour: v.number(),
  free: v.number(),
  requested: v.number(),
});

const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/** Shared input check of the preview and the save; loads the requested screens and all campaigns. */
async function validateRequest(ctx: QueryCtx | MutationCtx, args: Infer<typeof requestValidator>) {
  const startDate = requireDate(args.startDate, "startDate");
  const endDate = requireDate(args.endDate, "endDate");
  if (endDate < startDate || diffDays(startDate, endDate) + 1 > MAX_PERIOD_DAYS) fail("INVALID_INPUT", { field: "endDate" });
  if (!isInt(args.startHour, 0, 23)) fail("INVALID_INPUT", { field: "startHour" });
  if (!isInt(args.endHour, 1, 24) || args.endHour <= args.startHour) fail("INVALID_INPUT", { field: "endHour" });
  if (!isInt(args.slotsPerCycle, 1, SLOTS_PER_CYCLE)) fail("INVALID_INPUT", { field: "slotsPerCycle" });
  const ids = args.screenIds;
  if (ids.length < 1 || ids.length > MAX_SCREENS || new Set(ids).size !== ids.length) fail("INVALID_INPUT", { field: "screenIds" });
  const screens: Doc<"screens">[] = [];
  for (const id of ids) {
    const s = await ctx.db.get(id);
    if (!s) fail("INVALID_INPUT", { field: "screenIds" });
    screens.push(s);
  }
  // shortcut: full scan, ~10-15 campaigns in the demo (base design); add a date index if campaigns become real data.
  const campaigns = await ctx.db.query("campaigns").collect();
  const req = { startDate, endDate, startHour: args.startHour, endHour: args.endHour, slotsPerCycle: args.slotsPerCycle, screenIds: ids };
  return { req, screens, campaigns };
}

/** Placeholder key from the fixed list; video: stored, allowed type and size, not used by another campaign. */
async function checkCreative(ctx: MutationCtx, c: Infer<typeof creative>, campaigns: Doc<"campaigns">[]) {
  if (c.kind === "placeholder") {
    if (!(PLACEHOLDER_KEYS as readonly string[]).includes(c.key)) fail("INVALID_CREATIVE");
    return;
  }
  // shortcut: the 5 s duration is checked only in the browser (decision G-7); the server sees type and size.
  const file = await ctx.db.system.get(c.storageId);
  if (
    !file ||
    !(VIDEO_TYPES as readonly string[]).includes(file.contentType ?? "") ||
    file.size > VIDEO_MAX_BYTES ||
    campaigns.some((x) => x.creative.kind === "video" && x.creative.storageId === c.storageId)
  ) {
    fail("INVALID_CREATIVE");
  }
}

export const checkAvailability = query({
  args: requestArgs,
  returns: v.object({
    conflicts: v.array(conflict),
    conflictCount: v.number(),
    perDay: v.number(),
    total: v.number(),
    byScreen: v.array(v.object({ screenId: v.id("screens"), perDay: v.number() })),
  }),
  handler: async (ctx, { sessionId, ...args }) => {
    await requireActor(ctx, sessionId);
    const { req, screens, campaigns } = await validateRequest(ctx, args);
    const conflicts = findConflicts(req, screens, campaigns);
    // The plan math reads only the request fields; _id and _creationTime are never used for a draft.
    const draft = { ...req, name: "", _id: "" as Id<"campaigns">, _creationTime: 0 } satisfies CampaignRule;
    const byScreen = screens.map((s) => ({ screenId: s._id, perDay: plannedShowsForDay(draft, s, req.startDate) }));
    return {
      conflicts: conflicts.slice(0, MAX_CONFLICTS),
      conflictCount: conflicts.length,
      perDay: byScreen.reduce((sum, s) => sum + s.perDay, 0),
      total: plannedShows(draft, screens, req.startDate, req.endDate).total,
      byScreen,
    };
  },
});

export const create = mutation({
  args: { ...requestArgs, name: v.string(), advertiser: v.string(), creative },
  returns: v.id("campaigns"),
  handler: async (ctx, { sessionId, name, advertiser, creative: c, ...args }) => {
    await requireActor(ctx, sessionId);
    const { req, screens, campaigns } = await validateRequest(ctx, args);
    const fields = { name: name.trim(), advertiser: advertiser.trim() };
    for (const field of ["name", "advertiser"] as const) {
      if (fields[field].length < 1 || fields[field].length > MAX_TEXT) fail("INVALID_INPUT", { field });
    }
    await checkCreative(ctx, c, campaigns);
    // Re-checked in this transaction: a concurrent create changes the campaigns read set, so OCC re-runs this one.
    const conflicts = findConflicts(req, screens, campaigns);
    if (conflicts.length > 0) fail("SLOT_CONFLICT", { conflicts: conflicts.slice(0, MAX_CONFLICTS) });
    return await ctx.db.insert("campaigns", { ...fields, ...req, creative: c });
  },
});

export const generateUploadUrl = mutation({
  args: { sessionId: v.string() },
  returns: v.string(),
  handler: async (ctx, { sessionId }) => {
    await requireActor(ctx, sessionId);
    await enforceRateLimit(ctx, "upload", sessionId);
    return await ctx.storage.generateUploadUrl();
  },
});

const ORPHAN_AGE_MS = 24 * 3_600_000;

/** Daily cron (convex/crons.ts): deletes uploads older than 24 h that no campaign uses (abandoned or rejected forms). */
export const sweepOrphanUploads = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const used = new Set<string>();
    for (const c of await ctx.db.query("campaigns").collect()) if (c.creative.kind === "video") used.add(c.creative.storageId);
    // shortcut: 500 oldest files per run; the upload rate limit keeps new orphans far below that per day.
    const files = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", Date.now() - ORPHAN_AGE_MS))
      .take(500);
    const orphans = files.filter((f) => !used.has(f._id));
    for (const f of orphans) await ctx.storage.delete(f._id);
    return orphans.length;
  },
});
