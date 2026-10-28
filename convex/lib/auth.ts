// Demo-access guard (design D3, ADR-0003). The only file in convex/lib/ that takes ctx; the front never imports it.
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { fail } from "./errors";

export type Actor = { role: "admin"; sessionId: string };

/** First call of every public query and mutation: a valid, unexpired demo session, else UNAUTHENTICATED. */
export async function requireActor(ctx: QueryCtx | MutationCtx, sessionId: string): Promise<Actor> {
  const session = await ctx.db
    .query("demoSessions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .unique();
  if (!session || session.expiresAt <= Date.now()) fail("UNAUTHENTICATED");
  return { role: "admin", sessionId };
}
