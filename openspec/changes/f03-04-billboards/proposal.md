Status: draft

# Proposal: f03-04-billboards

## Why

SoW §4.3 F-3 «Билборды» (list, filters, map) and §4.4 F-4 (billboard card). The network owner (R-1) needs to see all 100 test screens of the network, find a screen by city, status, camera, occupancy or name, see them on a map, and open one screen to check its location, hours, occupancy, campaigns, schedule, demo audience and recent events. The card must agree with «Расписание», so both read the same shared slot functions of the base contract.

SoW functions: 4.3, 4.4

## What Changes

- New Convex queries in `convex/screens.ts` (next to the existing `screens.options`): `screens.list` (filtered rows with occupancy, active campaigns count and demo audience for the period) and `screens.get` (card data). Both call `requireActor` first and compute every value with the shared pure functions (`occupancy`, `hourSlots`, `campaignStatus`, `audienceDay`); no new tables.
- «Билборды» page `/billboards`: filters in URL search params, list of screens, Leaflet + OpenStreetMap map loaded lazily inside an error boundary (D-7, ADR-0009). The list stays usable when the map fails.
- Billboard card page `/billboards/:id`: one additive `<Route>` in `src/shell/AppShell.tsx` (G-2, not a contract change).
- Team defaults (G-3, orchestrator decision 2026-10-28): the audience and the occupancy on the list and the audience on the card cover the last 7 days up to today (UTC+5); the card schedule shows today's hours; "current occupancy" on the card is today's occupancy.
- Card schedule = a compact read-only list of today's working hours (hour, slots used of 12, campaign names or «Свободно»), built from `hourSlots`. It does not embed the F-7 hour/cycle component, so this change has no dependency on `f07-schedule` and no cycle.
- Screens without a camera show «нет камеры» (OQ-3) under the own key `billboards.noCamera`.
- New strings namespace `billboards` in `shared/strings/ru.ts`.
- New dependencies: `leaflet` 1.9.x, `react-leaflet` (compatible major), `@types/leaflet`.

## Capabilities

### New Capabilities
- `billboard-list`: the «Билборды» list, its filters and the map of screens.
- `billboard-card`: the card of one screen with its location, hours, occupancy, campaigns, schedule, demo audience and recent events.

### Modified Capabilities
None. `slot-model`, `audience-analytics`, `statuses`, `app-shell` are used as they are.

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.3.1 | list shows the 100 seed screens in 4 regions |
| 4.3.2 | list row shows every required field |
| 4.3.2 | screen without a camera shows нет камеры |
| 4.3.3 | filter by city |
| 4.3.3 | filter by status |
| 4.3.3 | filter by camera |
| 4.3.3 | filter by occupancy range |
| 4.3.3 | search by name or address |
| 4.3.4 | map shows a marker per listed screen |
| 4.3.4 | list stays usable when the map fails |
| 4.3.5 | seed has offline screens |
| 4.4.1 | card shows every required block |
| 4.4.1 | card shows recent screen events |
| 4.4.2 | card campaigns match the schedule slots |

## Out of scope

- Editing screens, statuses or events (seed only, base contract access matrix).
- Marker clustering, routing, geocoding, other tile providers (ADR-0009).
- A period picker on the list or the card (team default: last 7 days; no SoW period filter in 4.3.3).
- The F-7 hour/cycle view on the card, links from the card to «Расписание» or to the campaign card.
- Full audience analytics (age, gender, per-hour chart): F-8 «Аналитика аудитории».
- Mobile layout (SoW §9).

## Impact

- `convex/screens.ts` (append `list`, `get`), `convex/screens.test.ts` (new).
- `src/routes/Billboards.tsx`, new `src/routes/billboards/*` (card page, map, filters), `src/shell/AppShell.tsx` (one route line).
- `shared/strings/ru.ts` (append namespace `billboards`).
- `package.json`: `leaflet`, `react-leaflet`, `@types/leaflet`. Network: OSM tile servers at the meeting (K-03).
