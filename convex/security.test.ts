/// <reference types="vite/client" />
// convex/security.test.ts: abuse tests (echo-sdlc security gate, S4), from the template
// skills/checks/templates/security/security.test.ts. One CASES row per rate-limited public function
// (F-6 adds campaigns.generateUploadUrl). The custom-authorize tests of the template are replaced by
// the demo.signIn scenarios of spec demo-access «Sign-in rate limit» (no Convex Auth here, design D3a).
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { isRateLimitError } from "@convex-dev/rate-limiter";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { LIMITS, normalizeKey, rateLimiter, type LimitName } from "./rateLimits";

const modules = import.meta.glob("./**/*.*s");
const PASSWORD = "synthetic-demo-password-for-tests";

function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  vi.stubEnv("DEMO_PASSWORD", PASSWORD);
  return t;
}
type T = ReturnType<typeof setup>;

afterEach(() => vi.unstubAllEnvs());

/** Calls one key gets before its bucket is empty: the capacity, else the rate. */
function allowance(name: LimitName): number {
  const limit: { rate: number; capacity?: number } = LIMITS[name];
  return limit.capacity ?? limit.rate;
}

async function expectRateLimited(call: Promise<unknown>): Promise<void> {
  try {
    await call;
  } catch (error) {
    expect(isRateLimitError(error)).toBe(true);
    return;
  }
  throw new Error("expected a RateLimited error, the call succeeded");
}

const SESSION = "6f1c2b9e-3d4a-4f5b-8c7d-0e1f2a3b4c5d";
const wrong = (t: T, sessionId = SESSION) => t.mutation(api.demo.signIn, { sessionId, password: "wrong" });
const sessions = (t: T) => t.run((ctx) => ctx.db.query("demoSessions").collect());
const bucketOk = (t: T, sessionId = SESSION) =>
  t.run(async (ctx) => (await rateLimiter.check(ctx, "signInPerAccount", { key: normalizeKey(sessionId) })).ok);

const CASES: Array<{ fn: string; limit: LimitName; call: (t: T) => Promise<unknown>; prepare?: (t: T) => Promise<T> }> = [
  { fn: "demo.signIn", limit: "signInPerAccount", call: (t) => wrong(t) },
];

test("[security] every sensitive flow has a case", () => {
  expect(CASES.length).toBeGreaterThan(0);
});

for (const c of CASES) {
  test(`[security] ${c.fn} is rate limited`, async () => {
    let t = setup();
    if (c.prepare) t = await c.prepare(t);
    for (let i = 0; i < allowance(c.limit); i += 1) await c.call(t);
    await expectRateLimited(c.call(t));
  });
}

test("[base-contract] too many sign-in attempts", async () => {
  const t = setup();
  for (let i = 0; i < 5; i += 1) expect(await wrong(t)).toEqual({ ok: false, code: "WRONG_PASSWORD" });
  try {
    await t.mutation(api.demo.signIn, { sessionId: SESSION, password: PASSWORD });
    throw new Error("expected RateLimited");
  } catch (error) {
    expect(isRateLimitError(error)).toBe(true);
    expect((error as { data: { kind: string; retryAfter: number } }).data).toMatchObject({ kind: "RateLimited" });
    expect((error as { data: { retryAfter: number } }).data.retryAfter).toBeGreaterThan(0);
  }
  expect(await sessions(t)).toEqual([]);
});

test("[base-contract] wrong attempts stay counted", async () => {
  const t = setup();
  for (let i = 0; i < 5; i += 1) await wrong(t);
  expect(await bucketOk(t)).toBe(false);
});

test("[base-contract] global sign-in bucket", async () => {
  const t = setup();
  for (let i = 0; i < allowance("signInGlobal"); i += 1) await wrong(t, crypto.randomUUID());
  await expectRateLimited(t.mutation(api.demo.signIn, { sessionId: crypto.randomUUID(), password: PASSWORD }));
});

test("[base-contract] parallel sign-in attempts cannot pass the limit", async () => {
  const t = setup();
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => wrong(t)));
  const reached = results.filter((r) => r.status === "fulfilled");
  expect(reached.length).toBeLessThanOrEqual(5);
  for (const r of results) if (r.status === "rejected") expect(isRateLimitError(r.reason)).toBe(true);
});

test("[base-contract] correct password resets the session bucket", async () => {
  const t = setup();
  for (let i = 0; i < 4; i += 1) await wrong(t);
  expect(await t.mutation(api.demo.signIn, { sessionId: SESSION, password: PASSWORD })).toEqual({ ok: true });
  const value = await t.run((ctx) => rateLimiter.getValue(ctx, "signInPerAccount", { key: normalizeKey(SESSION) }));
  expect(value.value).toBe(allowance("signInPerAccount"));
  for (let i = 0; i < 5; i += 1) expect(await wrong(t)).toEqual({ ok: false, code: "WRONG_PASSWORD" });
});
