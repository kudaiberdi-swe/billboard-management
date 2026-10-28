// Screen queries (design D7). Feature changes add their own functions here; each calls requireActor first (D3).
import { v } from "convex/values";
import { query } from "./_generated/server";
import { city, screenStatus } from "./schema";
import { requireActor } from "./lib/auth";

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
