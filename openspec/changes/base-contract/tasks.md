Depends on: none
Complexity: hard
Reason: shared contract

# Tasks

Spec ids: `demo-access`, `demo-data`, `slot-model`, `statuses`, `audience-analytics`, `show-log`, `app-shell`. Design sections: D1–D10. Test titles: `[base-contract] <scenario name>`.

## 1. Setup

- [ ] 1.1 (both) Create the Vite + React + TypeScript app at the repo root with `convex/`, `src/`, `public/demo/`, `e2e/`; install the packages listed in `proposal.md` Impact at current stable versions (Leaflet stays for F-3); verify `npm run build` and `npx tsc --noEmit` pass.
- [ ] 1.2 (both) Run `node "${CLAUDE_PLUGIN_ROOT}/skills/base/scripts/scaffold.mjs"` to stamp `strings@1` into `shared/strings/`; commit `.echo/blocks.lock.json`; verify it prints `SCAFFOLD_DONE`.
- [ ] 1.3 (backend) Add `deploy/docker-compose.yml` from the Convex self-hosted template, `.env.local` names (`CONVEX_SELF_HOSTED_URL`, `CONVEX_SELF_HOSTED_ADMIN_KEY`, `VITE_CONVEX_URL`, `E2E_DEMO_PASSWORD`) and `DEMO_PASSWORD` in `TOKENS.md` (names only); verify `npx convex dev --once` pushes to the local backend.
- [ ] 1.4 (both) Configure vitest with `convex-test` (edge-runtime for `convex/`, jsdom for `src/`); verify an empty test run passes.

## 2. Backend: schema, errors, guard

- [ ] 2.1 (backend) Write `convex/schema.ts` exactly as design D2 (tables, validators, indexes); verify `npx convex dev --once` accepts it.
- [ ] 2.2 (backend) Write `convex/lib/errors.ts` (`ERROR_CODES`, `ErrorCode`, `fail`) per D5; verify a unit test that `fail("NOT_FOUND", { entity: "campaigns" })` throws a `ConvexError` with that data.
- [ ] 2.3 (backend) Write `convex/lib/auth.ts` `requireActor` per D3 and `convex/demo.ts` `signIn`, `sessionStatus`, `clearSessions` per D7; verify the `demo-access` scenarios with convex-test (correct, wrong, missing env, malformed id, expiry, re-sign-in, clear sessions, session status reveals no data).
- [ ] 2.4 (backend) Copy the plugin `templates/security/rateLimits.ts` and `convex.config.ts` to `convex/`, keep only the `signIn` and `upload` flows (D3a), `npm i @convex-dev/rate-limiter`, and call `enforceRateLimit(ctx, "signIn", sessionId)` in `demo.signIn` in the D3a order; verify `npx convex dev --once` accepts the component.
- [ ] 2.5 (backend) Copy `templates/security/security.test.ts` to `convex/security.test.ts` with a `CASES` row for `demo.signIn` (`limit: "signInPerAccount"`); verify the `[security]` tests and the `Sign-in rate limit` scenarios pass (`too many sign-in attempts`, `wrong attempts stay counted`, `global sign-in bucket`, `parallel sign-in attempts cannot pass the limit`, `correct password resets the session bucket`).
- [ ] 2.6 (backend) Write `convex/screens.ts` `options` per D7; verify `guarded query without a session` and `guarded call with a valid session`.

## 3. Backend: shared pure functions

- [ ] 3.1 (backend) Write `convex/lib/config.ts` and `convex/lib/time.ts` per D6; verify `cycle values`, `today in UTC+5`, `invalid date string`.
- [ ] 3.2 (backend) Write `convex/lib/slots.ts` (`isOn`, `hourSlots`, `usedSlots`, `plannedShowsForDay`, `plannedShows`, `occupancy`, `findConflicts`) per D6; verify every `slot-model` scenario, including the SoW example 720 / 2 160.
- [ ] 3.3 (backend) Write `convex/lib/status.ts` (`campaignStatus`, `notifications`) per D4 and D6; verify every `statuses` scenario; add a test that no public function validator accepts a `status` argument.
- [ ] 3.4 (backend) Write `convex/lib/hash.ts` and `convex/lib/analytics.ts` (`audienceHour`, `audienceDay`, `audienceProfile`) per D6; verify every `audience-analytics` scenario and a benchmark of `audienceDay` + `occupancy` for 100 screens × 366 days under 500 ms.
- [ ] 3.5 (backend) Write `convex/lib/showLog.ts` `simulateShowLog` per D6; verify every `show-log` scenario.
- [ ] 3.6 (backend) Verify `convex/lib/*` (except `auth.ts`) imports nothing from `convex/_generated/server` or `ctx`, so the front can import it (a test or lint rule).

## 4. Backend: seed and reset

- [ ] 4.1 (backend) Write `convex/seed.ts` `seedData(ctx, today)` per D8 and `demo.seed` internal mutation; verify every `Synthetic seed of the network` and `Seed campaigns and show log` scenario for 3 different `today` values.
- [ ] 4.2 (backend) Write `demo.reset` per D7; verify the `Reset restores the seed` scenarios (user campaign gone, video file deleted, sessions kept, no session rejected) and `data is shared between sessions`.
- [ ] 4.3 (backend) Add the static demo images to `public/demo/creatives/` (`placeholder-1..4`) and `public/demo/screens/` (TODO(team): images with a free licence, no people); verify every seeded `imageKey` and every `PLACEHOLDER_KEYS` item has a file.

## 5. Frontend skeleton

- [ ] 5.1 (frontend) Add the project namespaces to `shared/strings/ru.ts` per D9 (errors, status, slot, cities, notifications, demo, login, screenEvents); verify `shared/strings/strings.test.ts` passes.
- [ ] 5.2 (frontend) Write `src/main.tsx` providers, `src/session.ts` (`useGuardedQuery`, `useGuardedMutation`) and `src/errors.ts` (`errorText`) per D3, D5, D9; verify `error code becomes text`, `unknown error` and `status codes become text` component tests.
- [ ] 5.3 (frontend) Write `src/shell/Gate.tsx` and `src/shell/PasswordScreen.tsx`; verify `visitor without a session sees only the password screen`, `correct password opens Главная`, `wrong password shows an error`, `expired session returns to the password screen`.
- [ ] 5.4 (frontend) Write `src/shell/AppShell.tsx` (left menu from the contract routes, «BillBoard», «Сбросить демо» with confirm modal, class `no-print`) and empty pages in `src/routes/` for the 6 sections; verify `menu shows the 6 sections in order`, `menu item opens its section`, `unknown route`, `reset asks for confirmation`, `reset cancelled`, `reset confirmed`.
- [ ] 5.5 (frontend) Write `src/components/DemoLabel.tsx` and `src/print.css`; verify `demo label shows the verbatim text`.
- [ ] 5.6 (frontend) Add a check that fails on Cyrillic text in `src/**/*.tsx` outside `shared/strings/`; verify `no inline text in components`.

## 6. E2E setup and integration

- [ ] 6.1 (both) Copy the plugin e2e templates (`playwright.config.ts`, `e2e/fixtures.ts`, `e2e/smoke.spec.ts`, `e2e/a11y.spec.ts`, `.playwright/cli.config.json`), replace the dev-identity sign-in with the password screen and `E2E_DEMO_PASSWORD`, set the smoke routes to the 6 sections; run `npx playwright install chromium`; verify the smoke and a11y specs pass against the local stack with the seed.
- [ ] 6.2 (both) Run the whole local gate: `npx tsc --noEmit`, `npx vitest run`, `npx playwright test --grep @smoke`; verify all pass.

## Workflow follow-up

- After the build passes review, archive `base-contract` and lock it; feature changes then use it as `Depends on: base-contract`.
