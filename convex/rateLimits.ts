// convex/rateLimits.ts: every rate limit of the project in one place (echo-sdlc security gate, S1-S4).
// Source: echo-sdlc skills/checks/templates/security/rateLimits.ts, cut to the flows this project has
// (design D3a): `signIn` (demo.signIn) and `upload` (campaigns.generateUploadUrl, F-6). Template values.
//
// Rules (skills/checks/references/abuse.md):
// - Convex sees no client IP and the demo has no accounts: the sign-in key is the client's sessionId,
//   so the global bucket is the real control against guessing.
// - A limit consumed in a mutation that then throws is rolled back with it: demo.signIn returns
//   { ok: false } on a wrong password instead of throwing, so the attempt stays counted.
// - Check and consume in one call.
import { MINUTE, HOUR, RateLimiter, type RateLimitConfig } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const LIMITS = {
  signInPerAccount: { kind: "token bucket", rate: 10, period: 15 * MINUTE, capacity: 5 },
  signInGlobal: { kind: "token bucket", rate: 300, period: MINUTE, capacity: 300 },
  uploadUrlPerUser: { kind: "token bucket", rate: 20, period: HOUR, capacity: 5 },
  uploadUrlGlobal: { kind: "token bucket", rate: 600, period: HOUR, capacity: 100 },
} satisfies Record<string, RateLimitConfig>;

export type LimitName = keyof typeof LIMITS;

/** Each flow: the per-key bucket, then the global bucket. */
export const FLOWS = {
  signIn: ["signInPerAccount", "signInGlobal"],
  upload: ["uploadUrlPerUser", "uploadUrlGlobal"],
} as const satisfies Record<string, readonly [LimitName, LimitName]>;

export type Flow = keyof typeof FLOWS;

export const rateLimiter = new RateLimiter(components.rateLimiter, LIMITS);

type LimitCtx = Parameters<typeof rateLimiter.limit>[0];

/** One spelling per key. Capped so a huge key is not stored. */
export function normalizeKey(key: string): string {
  return key.trim().toLowerCase().slice(0, 320);
}

/**
 * Consumes the flow's per-key bucket, then its global bucket. Over either limit it throws
 * ConvexError({ kind: "RateLimited", name, retryAfter }) (isRateLimitError on the client).
 */
export async function enforceRateLimit(ctx: LimitCtx, flow: Flow, key: string): Promise<void> {
  const [perKey, global] = FLOWS[flow];
  await rateLimiter.limit(ctx, perKey, { key: normalizeKey(key), throws: true });
  await rateLimiter.limit(ctx, global, { throws: true });
}
