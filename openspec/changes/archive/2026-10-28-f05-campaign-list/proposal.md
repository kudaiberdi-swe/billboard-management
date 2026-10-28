Status: draft

# Proposal: f05-campaign-list

## Why

SoW §4.5 F-5 «Рекламные кампании» list (ТЗ §8). The admin (R-1) needs one place that lists all campaigns of the network with their advertiser, period, cities and screens, status computed from the dates, planned shows and shows by the demo log. Orchestrator decision G-1 (2026-10-28): this change also owns the campaign card page `/campaigns/:id` and its query `campaigns.get`, because F-7 AC5 links campaign names to "the campaign card" and F-10 AC1 puts «Смоделировать показы» on it.

SoW functions: 4.5

## What Changes

- New public query `campaigns.list`: every campaign with computed status, cities, screen count, planned shows and shows by the log.
- New public query `campaigns.get`: one campaign for the card page, with per-screen planned shows and shows by the log; `NOT_FOUND` for an unknown or malformed id.
- `src/routes/Campaigns.tsx` filled with the list; new card page `src/routes/campaigns/CampaignCard.tsx` on route `/campaigns/:id` (one additive `<Route>` in `src/shell/AppShell.tsx`, gap G-2).
- New strings namespace `campaigns` in `shared/strings/ru.ts`.
- No new tables, no writes, no contract change.

Out of scope:
- Campaign creation, the «Создать кампанию» entry point and the `/campaigns/new` route (f06-campaign-create; f06 adds its own button to the list page).
- The «Смоделировать показы» button on the card (f10-simulate-shows adds it to the card page this change creates).
- Campaign edit and delete (contract: campaigns are create-only; delete only by «Сбросить демо»).
- List filters, sorting controls and pagination (not in F-5; ~10-15 campaigns).
- The report itself (f09-reports), the schedule view (f07-schedule).

## Capabilities

### New Capabilities

- `campaign-list`: the «Рекламные кампании» list with computed status, plan and log values.
- `campaign-card`: the campaign card page `/campaigns/:id` and its read query.

### Modified Capabilities

None. Reuses `statuses` (campaign status from dates), `slot-model` (planned shows), `show-log` (log values), `demo-data` (seed campaigns), `demo-access` (session guard).

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.5.1 | seed has the three named campaigns |
| 4.5.2 | row shows all campaign fields |
| 4.5.2 | log shows are the sum of the show log |
| 4.5.2 | campaign without log shows zero |
| 4.5.3 | status before the start date |
| 4.5.3 | status between start and end |
| 4.5.3 | status after the end date |
| 4.5.4 | seed has no real brand names |

## Impact

- Code: `convex/campaigns.ts` (new module; shared append-only with f06-campaign-create, distinct export names), `convex/campaigns.test.ts`, `src/routes/Campaigns.tsx`, `src/routes/campaigns/CampaignCard.tsx`, `src/shell/AppShell.tsx` (one route line), `shared/strings/ru.ts` (namespace `campaigns`).
- Downstream: f07-schedule links to `/campaigns/:id`; f10-simulate-shows places its button on the card page; f09-reports uses `campaigns.list` for its campaign picker.
