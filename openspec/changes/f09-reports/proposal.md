Status: draft

# Proposal: f09-reports

## Why

SoW §4.9 F-9 «Отчёты» and print (ТЗ §11). The network owner gives advertisers a report for one campaign: what was planned, what the demo log recorded, and simulated screen analytics, kept in 2 separate blocks so screen traffic is never presented as a confirmed ad audience. Export is browser print only with a print stylesheet (D-12, ADR-0010). The contacts estimate reuses the D-4 helper `estimateContacts` of f02-dashboard (orchestrator decision G-4), so «Главная» and «Отчёты» show the same number.

SoW functions: 4.9

## What Changes

- New public query `reports.campaign` in new module `convex/reports.ts`: one campaign, filtered by period, city and billboard; returns header data, block «Результаты размещения» (planned, log, completion %, per day, per screen) and block «Аналитика экранов» (traffic, looks, contacts).
- `src/routes/Reports.tsx` filled: filters in URL search params, the report, the disclaimer, the «Печать / сохранить в PDF» button (`window.print()`).
- `src/print.css` extended: A4 portrait `@page`, no page break inside a block, fixed chart width.
- New strings namespace `reports` in `shared/strings/ru.ts`.
- No new tables, no writes, no contract change.

Out of scope:
- Automatic PDF generation, file download, sending the report (SoW §9.4, §9.7).
- A report across several campaigns, report history, saved reports.
- Audience profile (age, gender) and vehicles in the report (F-8 «Аналитика аудитории» covers them; not in F-9 AC2).
- Creating the show log (f10-simulate-shows); the report reads it.

## Capabilities

### New Capabilities

- `reports`: the «Отчёты» campaign report, its filters, its 2 blocks, the disclaimer and the print view.

### Modified Capabilities

None. Uses `slot-model` (planned shows), `show-log` (log values), `audience-analytics` (traffic, looks, «нет камеры»), `app-shell` (`no-print`, print.css), `demo-access`, and `campaign-contacts` from f02-dashboard.

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.9.1 | filter by period narrows the report |
| 4.9.1 | filter by city narrows the report |
| 4.9.1 | filter by billboard narrows the report |
| 4.9.1 | filters live in the URL |
| 4.9.2 | report shows all values |
| 4.9.3 | completion follows the formula |
| 4.9.4 | report has two separate blocks |
| 4.9.5 | no label claims a confirmed audience |
| 4.9.6 | report shows the demo disclaimer |
| 4.9.7 | print button opens the print dialog |
| 4.9.7 | print view hides menu and filters |
| 4.9.8 | seeded campaign has a full report |

## Impact

- Code: `convex/reports.ts`, `convex/reports.test.ts`, `src/routes/Reports.tsx`, `src/routes/reports/*` (blocks, filters), `src/print.css` (f09 only), `shared/strings/ru.ts` (namespace `reports`).
- Depends on f02-dashboard (`estimateContacts` in `convex/lib/contacts.ts`) and f05-campaign-list (`campaigns.list` for the campaign picker).
