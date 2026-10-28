Status: draft

# Proposal: f10-simulate-shows

## Why

SoW §4.10 F-10 «Смоделировать показы» (ТЗ §12). Shows by the log must stay a separate record from the plan: a campaign gets log values only by an explicit action. This change adds the action as a mutation and a button on the campaign card (page owned by f05-campaign-list, orchestrator decision G-1). It reuses the locked rule `simulateShowLog` (spec `show-log`, ADR-0007) through the base helper `replaceShowLog` (`convex/seed.ts`). First-pass review: `demo.reset` deletes all `showLog` rows in one transaction, so the simulated period of one run is capped at the last 31 days of the past part of the campaign.

SoW functions: 4.10

## What Changes

- New public mutation `showLog.simulate({ campaignId })` in new module `convex/showLog.ts`: replaces the campaign's show log with a fresh simulation over the capped window; `NOT_FOUND`, `CAMPAIGN_NOT_STARTED`.
- New constant `SIMULATE_MAX_DAYS = 31` exported from `convex/showLog.ts` (feature code, not `convex/lib/config.ts`).
- New component `src/components/SimulateShowsButton.tsx` placed in the header of the f05 campaign card page (one additive line in `src/routes/campaigns/CampaignCard.tsx`).
- New strings namespace `simulate` in `shared/strings/ru.ts`.
- No new tables, no new error codes, no contract change.

Out of scope:
- Any change to the simulation rule, the seed, or `demo.reset` (base contract).
- A confirmation dialog, an undo, or a per-screen / per-day choice of what to simulate (not in F-10).
- Rate limiting the action (contract: no other rate-limited flow).
- New UI on «Главная» or «Отчёты»: they read `showLog` reactively and show new values without code in this change.

## Capabilities

### New Capabilities

- `simulate-shows`: the «Смоделировать показы» action on the campaign card and its period cap.

### Modified Capabilities

None. Uses `show-log` (simulation rule, rerun replaces, log ≤ plan) unchanged; the 31-day window only narrows the dates the rule runs on.

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.10.1 | card has the simulate button |
| 4.10.2 | no log after today |
| 4.10.2 | today counts finished hours only |
| 4.10.2 | no log on offline screens |
| 4.10.2 | not started campaign is refused |
| 4.10.3 | log never exceeds plan after simulate |
| 4.10.4 | new log values reach the readers |

## Impact

- Code: `convex/showLog.ts`, `convex/showLog.test.ts`, `src/components/SimulateShowsButton.tsx` (+ test), `src/routes/campaigns/CampaignCard.tsx` (one line, f05 file), `shared/strings/ru.ts` (namespace `simulate`).
- Data: rewrites `showLog` rows of one campaign per run (≤ 100 screens × 31 days = 3 100 rows inserted).
- Depends on f05-campaign-list (card page and `campaigns.get`, which shows the new log totals).
