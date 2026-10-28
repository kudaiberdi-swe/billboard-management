Depends on: base-contract
Complexity: hard
Reason: map/geo (Leaflet + OSM with failure isolation) plus a card that must agree with the slot packing of «Расписание»

# Tasks

Spec ids: `billboard-list`, `billboard-card`. Design: `design.md` (Convex functions, Screens, Strings). Test titles: `[f03-04-billboards] <scenario name>`. Card schedule is a compact read-only list (no f07 dependency).

## 1. Setup

- [x] 1.1 (frontend) Add `leaflet` 1.9.x, a `react-leaflet` major whose peer range accepts Leaflet 1.9, and `@types/leaflet`; verify `npm ls leaflet react-leaflet` shows no peer warning and `npx tsc --noEmit` passes.
- [x] 1.2 (frontend) Append namespace `billboards` to `shared/strings/ru.ts` with the keys of design "Strings"; verify `npx tsc --noEmit` and the strings check (`src/strings-check.test.ts`) pass.

## 2. Backend

- [x] 2.1 (backend) Append `screens.list` to `convex/screens.ts` per design (requireActor first, 7-day period from `kzNow`, `occupancy`, `campaignStatus`, `audienceDay`, filters, INVALID_INPUT checks, `args` and `returns` validators); verify the scenario tests of task 4.1 pass.
- [x] 2.2 (backend) Append `screens.get` to `convex/screens.ts` per design (`normalizeId`, NOT_FOUND, campaigns with status, today's `hourSlots` per working hour, 7-day audience, last 10 `screenEvents` by `by_screen` desc); verify the scenario tests of task 4.2 pass.

## 3. Frontend

- [x] 3.1 (frontend) Fill `src/routes/Billboards.tsx`: URL-param filters, debounced search, table rows with image, status, hours, occupancy, active campaigns, camera, audience or «нет камеры», period text, `<DemoLabel />`, empty state; uses only `useGuardedQuery(api.screens.list, ...)`; verify task 4.3 tests pass.
- [x] 3.2 (frontend) Add `src/routes/billboards/ScreensMap.tsx` (lazy, react-leaflet, OSM tiles with attribution, markers from props, click opens the card; set Leaflet default marker icon URLs via Vite imports so markers render) and an error boundary in `Billboards.tsx` showing `billboards.mapUnavailable`; verify task 4.3 map tests pass and `npm run build` emits the map as a separate chunk.
- [x] 3.3 (frontend) Add `src/routes/billboards/BillboardCard.tsx` (named export `BillboardCard`): image, location, status, hours (round-the-clock), today's occupancy, campaigns with `status.*`, today's hours list (`slotsUsed`, names or «Свободно»), audience block with `<DemoLabel />` or «нет камеры», events with `screenEvents.*` and UTC+5 time, NOT_FOUND text and back link; verify task 4.4 tests pass.
- [x] 3.4 (frontend) Add `<Route path="/billboards/:id" element={<BillboardCard />} />` to `src/shell/AppShell.tsx` before the catch-all (G-2, additive only); verify the existing app-shell tests still pass and "row opens the card" passes.

## 4. Tests

- [x] 4.1 (backend) `convex/screens.test.ts`, convex-test with the seed and with small hand-made fixtures: list shows the 100 seed screens in 4 regions; seed has offline screens; list without a session is refused; occupancy uses the 7-day period; period is shown (backend `from`/`to`); finished campaign is not counted as active; screen with a camera shows the period audience; screen without a camera shows нет камеры (backend `audience` null); filter by city; filter by status; filter by camera; filter by occupancy range; search by name or address; no screen matches; invalid occupancy range is refused; too long search is refused.
- [x] 4.2 (backend) same file: card without a session is refused; unknown screen id (malformed and deleted id -> NOT_FOUND `screens`); card lists assigned campaigns with status; card campaigns match the schedule slots (compare each hour with `hourSlots`); free hour shows Свободно (backend `used` 0); hours outside working hours are not listed; round-the-clock screen (backend 24 hours); card shows the demo audience; card of a screen without a camera; card of a screen without the vehicle metric; card shows recent screen events; screen without events.
- [x] 4.3 (frontend) `src/routes/Billboards.test.tsx`, Testing Library with mocked guarded query: list row shows every required field; screen without a camera shows нет камеры; filters combine and survive refresh (URL params restored); map shows a marker per listed screen (map module mocked); marker opens the card; list stays usable when the map fails (lazy module rejects, list and filters still work); row opens the card.
- [x] 4.4 (frontend) `src/routes/billboards/BillboardCard.test.tsx`: card shows every required block; round-the-clock screen; free hour shows Свободно; unknown screen id (NOT_FOUND text and back link); card of a screen without a camera.
- [x] 4.5 (both) Run `npx tsc --noEmit`, `npx vitest run` and the echo checks (authz, wiring, scenarios); verify all pass and every scenario of both specs has a test titled `[f03-04-billboards] <scenario name>`.
