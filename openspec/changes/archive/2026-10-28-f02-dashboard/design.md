# Design: f02-dashboard

## Context

See proposal.md - Why. The base contract is locked: tables `screens`, `campaigns`, `showLog` (archive `2026-10-28-base-contract`), the guard `requireActor`, and the pure functions in `convex/lib` (`slots.ts`, `analytics.ts`, `status.ts`, `time.ts`). Nothing here is stored: every value is computed in the query from ~100 screens, ~10-15 campaigns and the show log rows of the period.

## Goals / Non-Goals

**Goals:**
- One reactive query for all filtered values, one for the network-wide notifications.
- One D-4 helper (`convex/lib/contacts.ts`) that f09-reports imports unchanged.

**Non-Goals:**
- Caching, precomputed aggregates, crons or new tables.
- Notification read state, history of screen status.

## Convex functions

All public functions take `sessionId: v.string()` (added by `useGuardedQuery`) and call `requireActor(ctx, args.sessionId)` first. Args below are listed without it. Role: `admin` (R-1, every valid demo session).

| Function | Kind | Args | Returns | Roles | Notes |
|----------|------|------|---------|-------|-------|
| `dashboard.summary` | query | `{ from: v.string(), to: v.string(), city: v.optional(city), screenId: v.optional(v.id("screens")) }` | `{ screens: { total: number, online: number, offline: number }, activeCampaigns: number, occupancy: { percent: number, occupied: number, total: number }, plannedShows: number, logShows: number, contacts: number, looks: number, occupancyByDay: Array<{ date: string, percent: number }>, screensByCity: Array<{ city: City, count: number }>, activeList: Array<{ _id: Id<"campaigns">, name: string, advertiser: string, endDate: string }> }` | admin | `requireDate(from,"from")`, `requireDate(to,"to")`; `from > to` -> `INVALID_INPUT {field:"to"}`; `diffDays(from,to)+1 > MAX_PERIOD_DAYS` -> `INVALID_INPUT {field:"period"}`; unknown `screenId` -> `NOT_FOUND {entity:"screen"}`; `city` uses the exported schema validator. Selection = screens matching all given filters (may be empty -> zeros). |
| `dashboard.notifications` | query | `{}` | `Array<{ kind: "screen_offline" \| "campaign_ending", refId: string, name: string }>` | admin | `notifications(allScreens, allCampaigns, kzNow(Date.now()).date)` from `convex/lib/status.ts`, unchanged order. Not filtered. |

Exact `returns` validators mirror the types above (`v.object`, `v.array`, `v.union(v.literal(...))`).

### `dashboard.summary` composition (all lib calls, no re-derived math)

`today = kzNow(Date.now()).date`. `sel` = selected screens, `ids` = their id set. `onSel` = campaigns with a screen in `ids` and dates overlapping `[from,to]`.

| Value | Computation |
|-------|-------------|
| `screens.*` | counts over `sel` by stored `status` |
| `activeCampaigns`, `activeList` | `onSel` with `campaignStatus(c, today) === "active"`; list sorted by `endDate`, then name |
| `occupancy`, `occupancyByDay` | `occupancy(sel, allCampaigns, from, to)` (all campaigns: occupancy counts slots of any campaign on `sel`) |
| `plannedShows` | sum of `plannedShows(c, sel, from, to).total` over `onSel` |
| `logShows` | `showLog` via index `by_date` range `[from,to]`, rows with `screenId` in `ids`, sum of `shows` |
| `contacts` | sum of `estimateContacts(c, sel, from, to).total` over `onSel` |
| `looks` | sum over `sel`, `datesInRange(from,to)` of `audienceDay(s, d)?.looks ?? 0` |
| `screensByCity` | counts over `sel` per `CITIES` entry, all 4 cities listed (0 allowed) |

## Pure helper `convex/lib/contacts.ts` (new, owned by this change)

```ts
export function estimateContacts(c: CampaignRule, screens: ScreenRule[], from: DateStr, to: DateStr):
  { total: number; byDay: { date: DateStr; contacts: number }[]; byScreen: { screenId: Id<"screens">; contacts: number }[] }
```

- Period clipped to the campaign dates, like `plannedShows` (byDay covers the clipped days only).
- Per screen `s` of `c` in `screens`, per day `d`: `round(sum over h in 0..23 with isOn(c,s,d,h) of audienceHour(s,d,h).looks × c.slotsPerCycle / SLOTS_PER_CYCLE)`; `audienceHour` null (no camera) adds 0.
- Why `looks × slots/12`: traffic during the campaign shows = people of the hour × the share of the hour the ad plays (slotsPerCycle × 5 s / 60 s); look rate = looks / people of that hour; the product reduces to looks × slots/12 and stays 0 when people is 0. Sum over campaigns of one screen-hour never exceeds that hour's looks (≤ 12 slots).
- Rounding per screen-day; total, byDay and byScreen are sums of those integers, so parts sum exactly.
- No ctx, no `Math.random`; importable by the front and by f09-reports.

## Data

None. No new tables or fields. Reads `screens`, `campaigns`, `showLog`.

## Screens

| Screen | Route | Role | Functions |
|--------|-------|------|-----------|
| «Главная» (`src/routes/Home.tsx`, parts in `src/routes/home/*`) | `/` | R-1 | `screens.options` (billboard picker, filtered by city on the client), `dashboard.summary`, `dashboard.notifications` |

- Filters: «период» (Mantine `DatePickerInput type="range"`), «город» (`cities.*`), «билборд» (`screens.options`). URL params `from`, `to`, `city`, `screen`. Default period: `addDays(today,-6)`..`today` (team). Changing «город» clears a billboard of another city.
- 8 cards in one grid; the cards for shows by the log, contacts and looks render `<DemoLabel />`. Chart: Mantine `LineChart` of `occupancyByDay`. City block: list of `cities.*` + count. Active list: name, advertiser, end date. Notifications: list of `notifications.<kind>` + name (existing strings), empty state text from `dashboard.noNotifications`.
- Errors: `useGuardedQuery` result errors render `errorText(error)`.

### Strings (`dashboard` namespace, team copy unless quoted from SoW)

`filterPeriod` «Период», `filterCity` «Город», `filterBillboard` «Билборд» (SoW filter names «период», «город», «билборд», capitalized as labels), `allCities` «Все города», `allBillboards` «Все билборды», `screens` «Экраны в сети», `online` «Онлайн», `offline` «Офлайн», `activeCampaigns` «Активные кампании», `occupancy` «Занятость рекламного инвентаря, %» (SoW glossary «занятость рекламного инвентаря»), `plannedShows` «Запланированные показы» (glossary), `logShows` «Показы по журналу» (glossary), `contacts` «Оценочные контакты с аудиторией», `looks` «Взгляды на экран», `occupancyChart` «Занятость по дням», `screensByCity` «Экраны по городам», `activeList` «Активные кампании», `endsOn` «до {date}», `notificationsTitle` «Уведомления», `noNotifications` «Нет уведомлений». Card wording other than glossary terms is team copy (SoW §4.2 gives English names only).

## Decisions

- Two queries, not one: notifications are network-wide and must not change with the filters; a separate query keeps that rule visible and testable. Alternative (inside `summary`) rejected.
- `screenId` not found -> `NOT_FOUND` (existing code) instead of silent zeros: stale URLs after «Сбросить демо» show `errors.NOT_FOUND` text («Возможно, демо было сброшено»).
- Contacts and planned shows use the schedule (planned slots), not the show log, so they exist for future days of the period too. Shows by the log come only from `showLog`.
- Occupancy passes all campaigns (not only `onSel`), since `occupancy` itself filters by screen and date.

## Risks / Trade-offs

- [366-day period over 100 screens: occupancy ~585k hour steps plus ~880k `audienceHour` calls for looks/contacts, near the Convex query time limit] -> task 1.4 measures it on the full seed; if over ~500 ms, compute looks with `audienceDay` (already) and contacts per day via `isOn` hour loops only for campaign screens (already narrow). Last resort: `// shortcut:` cap of the dashboard period noted in code, reported to the team (no contract change: `MAX_PERIOD_DAYS` stays the validator).
- [Notification for a campaign that has not started but ends within 3 days] -> accepted: locked `notifications` rule (D-5) applies as is.
- [D-3/D-4 not yet confirmed by the client (Q-06)] -> formulas live in one place each (`occupancy`, `estimateContacts`).

## Open Questions

- TODO(client): confirm the D-4 composition (traffic in the campaign's slots × look rate per hour, Q-06). Non-blocking; demo uses the formula above.
- TODO(client): Russian card labels other than the glossary terms (team copy above until then). Non-blocking.
