Depends on: base-contract, f05-campaign-list
Complexity: routine
Reason: one mutation that reuses the locked show-log helper plus one button; the only rule is the 31-day window and two refusal codes.

# Tasks

## 1. Backend

- [x] 1.1 [backend] Create `convex/showLog.ts` with `SIMULATE_MAX_DAYS = 31` and `showLog.simulate` (`requireActor` first; NOT_FOUND; CAMPAIGN_NOT_STARTED before writes; clipped campaign into `replaceShowLog`; `args`/`returns` validators per design.md; `echo:no-rate-limit` marker); verify `npx tsc --noEmit`.
- [x] 1.2 [backend] `convex/showLog.test.ts` (convex-test, `seedData`, fake timers for today/hour): `[f10-simulate-shows] no log after today`, `today counts finished hours only`, `no log on offline screens`, `rerun replaces the log`, `log never exceeds plan after simulate`, `simulated period is capped at 31 days`, `finished campaign keeps its last 31 days`; verify `npx vitest run convex/showLog.test.ts` passes.
- [x] 1.3 [backend] Same file: `[f10-simulate-shows] new log values reach the readers` (sum via `campaigns.get`, rows via `showLog.by_date` and `by_campaign`), `deleted campaign is refused`, `simulate without session is refused`, `not started campaign is refused` (backend part: code and 0 rows); verify vitest passes.

## 2. Frontend

- [x] 2.1 [frontend] Add namespace `simulate` to `shared/strings/ru.ts` (append only); verify the strings check test passes.
- [x] 2.2 [frontend] Add `src/components/SimulateShowsButton.tsx` (design.md) and one line in the header group of `src/routes/campaigns/CampaignCard.tsx`; verify the component tests in 2.3.
- [x] 2.3 [frontend] Component tests (vitest + Testing Library, mocked mutation): `[f10-simulate-shows] card has the simulate button`, `button shows the result`, `not started campaign is refused` (front part: error text shown); verify vitest passes.

## 3. Integration

- [x] 3.1 [both] Run `npx tsc --noEmit`, `npx vitest run` and the echo checks (authz, wiring, scenarios, security gate); verify all pass.
