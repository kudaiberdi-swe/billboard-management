Status: draft

# Proposal: f02-dashboard

## Why

SoW §4.2 F-2 «Главная». The owner opens the demo and needs one screen with the state of the screen network and the key values for a chosen period: screens, online/offline, active campaigns, inventory occupancy (D-3), planned shows, shows by the demo log, estimated contacts (D-4) and screen looks, plus the in-app list «Экран недоступен» / «Кампания скоро завершится» (D-5). Today `src/routes/Home.tsx` is an empty stub.

SoW functions: 4.2

## What Changes

- New Convex module `convex/dashboard.ts` with `dashboard.summary` (cards, per-day occupancy chart, screens per city, active campaigns list; filters period, city, billboard) and `dashboard.notifications` (in-app list).
- New pure helper `convex/lib/contacts.ts` with `estimateContacts` (D-4 formula). Project code owned by this change, not a contract change (orchestrator decision G-4). f09-reports reuses it and depends on this change.
- `src/routes/Home.tsx` (+ `src/routes/home/*`) filled: filters «период», «город», «билборд» in URL search params, 8 cards, occupancy-per-day chart, screens-per-city block, active campaigns list, notifications list, demo labels.
- New strings namespace `dashboard` in `shared/strings/ru.ts` (append only).
- Reuses locked lib: `occupancy`, `plannedShows`, `isOn` (slots.ts), `audienceDay`/`audienceHour` (analytics.ts), `campaignStatus`, `notifications` (status.ts), `kzNow`, `requireDate`, `datesInRange`, `diffDays` (time.ts). No slot, status, occupancy or audience math is re-implemented.

## Capabilities

### New Capabilities
- `dashboard`: the «Главная» section: network state cards, occupancy chart, screens per city, active campaigns, filters and the in-app notifications list.
- `campaign-contacts`: the D-4 estimate of contacts with a campaign, one definition shared by «Главная» and «Отчёты».

### Modified Capabilities
None. `audience-analytics`, `slot-model`, `statuses`, `show-log` are used as they are.

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.2.1 | cards show the network values |
| 4.2.1 | screen looks card sums looks |
| 4.2.2 | planned and log shows are separate cards |
| 4.2.3 | occupancy percent follows D-3 |
| 4.2.4 | contacts follow D-4 |
| 4.2.4 | simulated cards carry the demo label |
| 4.2.5 | occupancy chart per day |
| 4.2.5 | screens per city block |
| 4.2.5 | active campaigns list |
| 4.2.6 | city filter changes all values |
| 4.2.6 | billboard filter changes all values |
| 4.2.6 | period filter changes all values |

Notifications (SoW §4.2 table): «Экран недоступен» = scenario `offline screen notification`; «Кампания скоро завершится» = scenario `ending campaign notification`.

## Out of scope

- Push, e-mail or any channel other than the in-app list on «Главная»; read/dismiss state of notifications.
- Screen status history (screen counts show the current status only).
- Prices and money values (D-11).
- Any write function: «Главная» is read-only.
- Campaign card page and links to it (owned by f05-campaign-list).

## Impact

- Code: `convex/dashboard.ts`, `convex/lib/contacts.ts`, `convex/dashboard.test.ts`, `convex/lib/contacts.test.ts`, `src/routes/Home.tsx`, `src/routes/home/*`, `shared/strings/ru.ts` (new `dashboard` namespace).
- No schema change, no new tables, no new error codes, no new rate limit.
- Downstream: f09-reports imports `estimateContacts` from `convex/lib/contacts.ts`.
