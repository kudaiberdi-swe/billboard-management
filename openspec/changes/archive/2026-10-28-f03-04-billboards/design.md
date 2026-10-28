# Design: f03-04-billboards

## Context

See proposal.md - Why. The base contract (locked) gives the `screens`, `campaigns`, `screenEvents` tables, `requireActor`, error codes and the pure functions in `convex/lib/` (`occupancy`, `hourSlots`, `campaignStatus`, `audienceDay`, `kzNow`, `addDays`, `datesInRange`). `convex/screens.ts` already has `screens.options`; this change appends to it (single owner, G-10). Leaflet is not installed yet.

## Goals / Non-Goals

**Goals:** two read-only queries that compute everything server-side with the shared functions; a list page with URL filters and a lazy map; a card page.

**Non-Goals:** writes of any kind, a period picker, the F-7 cycle view, pagination (100 seed screens).

## Convex functions

All take `sessionId` (added by `useGuardedQuery`); args below are without it. Both call `requireActor(ctx, args.sessionId)` first. Roles: R-1 (`admin`), permission `screens.read` / `campaigns.read`.

| Function | Kind | Args | Returns | Roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `screens.list` | query | `{ city?: city, screenStatus?: screenStatus, camera?: v.boolean(), occupancyMin?: v.number(), occupancyMax?: v.number(), search?: v.string() }` (`city`, `screenStatus` validators imported from `convex/schema.ts`) | `{ from: string, to: string, rows: Array<{ _id: Id<"screens">, code, name, city, address, lat, lng, status, workStartHour, workEndHour, imageKey, hasCamera: boolean, occupancyPercent: number, activeCampaigns: number, audience: number \| null }> }` sorted by code | R-1 | `today = kzNow(Date.now()).date`, `from = addDays(today, -6)`, `to = today`. `occupancyPercent = occupancy([s], campaigns, from, to).percent`. `activeCampaigns` = campaigns with `campaignStatus(c, today) === "active"` and `s._id` in `screenIds`. `audience` = sum of `audienceDay(s, d).people` over `datesInRange(from, to)`, `null` when `audienceDay` returns null (no camera). Filters applied after computing; AND. `search`: trimmed, lower-cased substring of `name`, `code`, `address`; empty = none. Errors: occupancy bounds not integers 0..100 or min > max -> `INVALID_INPUT {field:"occupancy"}`; search > 100 chars -> `INVALID_INPUT {field:"search"}`; unknown `city`/`screenStatus` value -> argument validator rejects. The filter arg is `screenStatus`, not `status`: the base spec `statuses` rejects a `status` field on every public function. The URL param stays `status`; the front passes it as `screenStatus`. |
| `screens.get` | query | `{ screenId: v.string() }` | `{ today: string, from: string, to: string, screen: { _id, code, name, city, address, lat, lng, status, workStartHour, workEndHour, imageKey, hasCamera, hasVehicleMetric }, occupancyTodayPercent: number, campaigns: Array<{ _id: Id<"campaigns">, name, advertiser, startDate, endDate, startHour, endHour, slotsPerCycle, status: "planned" \| "active" \| "finished" }>, hours: Array<{ hour: number, used: number, campaigns: Array<{ _id: Id<"campaigns">, name: string }> }>, audience: { people: number, looks: number, vehicles: number \| null } \| null, events: Array<{ at: number, kind: "went_offline" \| "back_online" }> }` | R-1 | `ctx.db.normalizeId("screens", screenId)`; null id or missing doc -> `NOT_FOUND {entity:"screens"}` (string arg so a stale or malformed URL id gives NOT_FOUND, not a validator error). `occupancyTodayPercent = occupancy([s], campaigns, today, today).percent`. `campaigns`: all with `s._id` in `screenIds`, `status = campaignStatus(c, today)`, sorted by `startDate` then `_creationTime`. `hours`: for `h` in `[workStartHour, workEndHour)`, `slots = hourSlots(s, today, h, campaigns)`; `used` = slots with `campaignId`; `campaigns` = distinct slot owners in slot order. `audience`: sums of `people`, `looks`, `vehicles` (null when the screen has no vehicle metric) of `audienceDay` over `from..to`; null without camera. `events`: `screenEvents` index `by_screen` for `s._id`, `order("desc")`, `take(10)`. |

The status enum in `campaigns[].status` uses the base `CampaignStatus` codes; the front maps them with `status.*` strings. The backend returns no Russian.

## Data

None. No new tables or fields. Reads `screens`, `campaigns`, `screenEvents`.

## Screens

| Screen | Route | Role | Functions called |
| --- | --- | --- | --- |
| «Билборды» list, filters, map | `/billboards` (`src/routes/Billboards.tsx`, named export `Billboards`) | R-1 | `screens.list` |
| Billboard card | `/billboards/:id` (`src/routes/billboards/BillboardCard.tsx`, named export `BillboardCard`) | R-1 | `screens.get` |

- Filters: URL search params `city`, `status`, `camera` (`yes` / `no`), `occMin`, `occMax`, `q`. Unknown param values are dropped on the front before the call. Controls: Mantine `Select` (city from `cities.*`, status from `status.online/offline`, camera), `RangeSlider` 0–100 for occupancy, `TextInput` for search (debounced 300 ms).
- List: Mantine `Table`; image thumbnail `/demo/screens/<imageKey>` with `alt` = screen name; name links to `/billboards/<_id>`; `<DemoLabel />` above the table; period text from `from`/`to`.
- Map: `src/routes/billboards/ScreensMap.tsx`, loaded with `React.lazy`, wrapped in a small error boundary plus `Suspense`. Props: the rows already on the list (no second query). `react-leaflet` `MapContainer` fit to the markers' bounds, OSM tile URL `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with attribution «© OpenStreetMap contributors», one `Marker` per row, click -> `navigate("/billboards/" + _id)`. The error boundary renders `billboards.mapUnavailable`. Leaflet CSS imported inside the lazy module. The CSP of base already allows OSM tiles (fix round 1).
- Card: Mantine `Card` / `SimpleGrid` sections; `<DemoLabel />` on the audience block; working hours `0–24` render `billboards.roundTheClock`; event time formatted with dayjs in UTC+5; error `NOT_FOUND` -> `errorText` plus link `billboards.backToList`.
- `src/shell/AppShell.tsx`: add `<Route path="/billboards/:id" element={<BillboardCard />} />` before the catch-all route (G-2, additive; `SECTIONS` unchanged; the menu item stays marked via `startsWith`).

## Strings

Namespace `billboards` appended to `shared/strings/ru.ts`. SoW text: status names come from `status.*`, «Свободно» from `slot.free`, event labels from `screenEvents.*`, «Демонстрационные данные» from `<DemoLabel />`. New keys (all `team` copy unless marked): `title` «Билборды» is `routes.billboards` (reuse); `colName` «Название», `colLocation` «Город и адрес», `colImage` «Фото», `colStatus` «Статус», `colHours` «Режим работы», `colOccupancy` «Занятость, %», `colActiveCampaigns` «Активные кампании», `colCamera` «Камера», `colAudience` «Аудитория за период», `cameraYes` «есть», `cameraNo` «нет», `noCamera` «нет камеры» (OQ-3, from spec `audience-analytics`), `period` «Период: {from} – {to}», `filterCity` «Город», `filterStatus` «Статус», `filterCamera` «Камера», `filterOccupancy` «Занятость, %», `search` «Поиск по названию или адресу», `all` «Все», `empty` «Ничего не найдено», `mapUnavailable` «Карта недоступна. Список работает.», `roundTheClock` «Круглосуточно», `hoursRange` «{from}–{to}», `location` «Расположение», `occupancyToday` «Занятость сегодня», `campaigns` «Кампании на экране», `noCampaigns` «Кампаний нет», `scheduleToday` «Расписание на сегодня», `slotsUsed` «{used} из 12 слотов», `audience` «Аудитория за 7 дней», `people` «Люди в зоне видимости», `looks` «Взгляды на экран», `vehicles` «Транспорт», `events` «Последние события», `noEvents` «Событий нет», `backToList` «К списку билбордов».

## Decisions

1. **Server computes all values, filters server-side.** The front never re-implements occupancy or audience math (pack rule). Alternative: return all rows and filter on the front; rejected because the filter rules then need a second test surface and the pack names `screens.list` with filters.
2. **Fixed 7-day period, no period arg.** Orchestrator decision G-3 (team default). Alternative: `from`/`to` args; rejected: no SoW filter for it, and it adds validation for no demo value.
3. **Card schedule is its own compact list, not the F-7 component.** Both use `hourSlots`, so AC 4.4.2 holds by construction and is tested against `hourSlots` directly. Embedding an F-7 component would make f03-04 depend on f07; a shared component owned by f07 would serialise the waves. No dependency either way.
4. **`screenId` as `v.string()` + `normalizeId`.** Seed ids change on reset; old links must give `NOT_FOUND`, not a generic validator error.
5. **Map gets rows by props, lazy and isolated.** One query; an OSM or script failure is caught by the error boundary (ADR-0009). No clustering (100 markers).

## Risks / Trade-offs

- [Queries read `Date.now()`; Convex caches the result until the data changes] -> "today" and the 7-day window can lag after midnight until a reload or any write; accepted for the demo (same as other sections).
- [Per-screen `occupancy` over 7 days x 100 screens x ~15 campaigns] -> a few hundred thousand cheap operations per call; fine at seed size; scan shortcut from ADR-0004.
- [OSM tile policy, internet needed at the meeting (K-03)] -> list works without the map; tile URL is one constant.
- [`react-leaflet` major compatible with Leaflet 1.9 is UNVERIFIED in ADR-0009] -> builder checks the peer dependency at install time.

## Open questions

- TODO(client): preferred occupancy filter form (free range 0–100 % used now, or fixed bands such as "до 30 %", "30–70 %", "более 70 %").
- TODO(client): which audience value the list should show as "approximate audience" (people in view used now; looks is the alternative). Q-06 already asks to confirm D-3/D-4.
