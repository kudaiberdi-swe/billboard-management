# Design: f07-schedule

## Context

See proposal.md - Why. The base contract (locked) gives `screens`, `campaigns`, `requireActor`, `requireDate`, `kzNow`, the error codes and `hourSlots(s, date, hour, campaigns) => Slot[12]` (`{index, startSec, endSec, campaignId, campaignName}`), which already applies the dates, show hours, working hours and creation-order fill. `screens.options` feeds the pickers. The `/schedule` route and the empty `Schedule` page exist.

## Goals / Non-Goals

**Goals:** one read-only query that returns a day of one screen, computed only with `hourSlots`; a page with three URL pickers and expandable hours.

**Non-Goals:** writes, multi-screen or multi-day grids, a separate per-hour query, any code shared with f03-04 or f05.

## Convex functions

Takes `sessionId` (added by `useGuardedQuery`); args below are without it. Calls `requireActor(ctx, args.sessionId)` first. Role R-1 (`admin`), permissions `screens.read`, `campaigns.read`.

| Function | Kind | Args | Returns | Roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `schedule.day` | query | `{ screenId: v.string(), date: v.string() }` | `{ screen: { _id: Id<"screens">, code: string, name: string, city: city, status: screenStatus, workStartHour: number, workEndHour: number }, date: string, hours: Array<{ hour: number, used: number, slots: Array<{ index: number, startSec: number, endSec: number, campaignId: Id<"campaigns"> \| null, campaignName: string \| null }> }> }` | R-1 | `requireDate(date, "date")` -> `INVALID_INPUT {field:"date"}`. `ctx.db.normalizeId("screens", screenId)`; null or missing doc -> `NOT_FOUND {entity:"screens"}` (string arg so stale or malformed URL ids give NOT_FOUND). Reads all `campaigns` (scan shortcut, ADR-0004). `hours`: for `h` in `[workStartHour, workEndHour)`, `slots = hourSlots(s, date, h, campaigns)`, `used` = slots with a `campaignId`. Returns no Russian. |

Pickers use the existing `screens.options` (`{_id, code, name, city, status}` sorted by code); the city filter is applied on the front over that list.

## Data

None. Reads `screens`, `campaigns`.

## Screens

| Screen | Route | Role | Functions called |
| --- | --- | --- | --- |
| «Расписание» | `/schedule` (`src/routes/Schedule.tsx`, named export `Schedule`) | R-1 | `screens.options`, `schedule.day` |

- URL search params: `city` (city code), `screen` (screen id), `date` (`YYYY-MM-DD`). Missing `date` -> today from `kzNow(Date.now()).date` (team default). Changing the city clears a `screen` that is not in that city. Unknown `city` values are dropped. `schedule.day` is called with `"skip"` until a screen is selected.
- Pickers: Mantine `Select` city (`cities.*`, plus «Все» = no city), `Select` billboard (label `code name`, searchable), `DatePickerInput` (dayjs `ru`).
- Hours: Mantine `Accordion` (multiple), one item per hour; label `HH:00–HH+1:00` and `schedule.slotsUsed`, plus the distinct campaign names of the hour as links. Opening state is local (not in the URL).
- Slots: a 12-cell grid (`SimpleGrid cols={6}` or 12). Time label from `schedule.slotTime` with two-digit `startSec`/`endSec` («00–05 сек.»). Occupied cell: `data-state="occupied"`, filled background (theme primary light), campaign name as `<Link to={"/campaigns/" + campaignId}>`. Free cell: `data-state="free"`, outlined, dimmed text `slot.free` «Свободно». The difference is text + border + background, not color only.
- Errors: `NOT_FOUND` / `INVALID_INPUT` -> `errorText` in an `Alert`; pickers stay usable.
- No `<DemoLabel />`: the schedule shows planned slots, not simulated values (F-1 AC2 applies to simulated values only).

## Strings

Namespace `schedule` appended to `shared/strings/ru.ts`. SoW text: «Свободно» from `slot.free`, city names from `cities.*`, section title from `routes.schedule`. New keys: `slotTime` «{from}–{to} сек.» (format from SoW 4.7.3 «00–05 сек. … 55–60 сек.»); team copy: `city` «Город», `allCities` «Все», `billboard` «Билборд», `date` «Дата», `selectBillboard` «Выберите билборд, чтобы увидеть расписание», `hourRange` «{from}–{to}», `slotsUsed` «Занято {used} из 12», `cycleTitle` «Минутный цикл».

## Decisions

1. **One query `schedule.day` instead of `day` + `hour`.** A day is at most 288 slots; returning them at once makes opening an hour instant and halves the API surface. Alternative: `schedule.hour` per opened hour (pack suggestion); rejected as extra code and loading states for no gain.
2. **Only `hourSlots` computes slots.** Same function as the billboard card (f03-04) and the F-6 conflict check, so F-4 AC2 holds without a code link between changes.
3. **Campaign link is a plain route link.** `/campaigns/:id` is owned by f05-campaign-list. f07 neither imports f05 code nor calls `campaigns.get`, so `Depends on` stays `base-contract` only. If f07 is built before f05, the link lands on the catch-all route (`/`) until f05 merges; the link target is still correct.
4. **Only working hours are listed.** Hours outside the working hours can never hold a slot (`slot-model`); listing them adds 8 empty rows for typical screens.

## Risks / Trade-offs

- [Query reads `Date.now()` only on the front for the default date; the backend uses the given date] -> no cache staleness on the backend.
- [Full `campaigns` scan per call] -> 10–15 seed campaigns plus demo-created ones; fine (ADR-0004 shortcut).
- [f05 not merged yet] -> campaign links fall back to `/` until it is; e2e of 4.7.5 runs after both merge.

## Open questions

None.
