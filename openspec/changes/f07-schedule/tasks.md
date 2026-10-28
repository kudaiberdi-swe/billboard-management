Depends on: base-contract
Complexity: routine
Reason: read-only view of one screen and day over the shared hourSlots; no writes, no new rules

# Tasks

Spec id: `schedule`. Design: `design.md` (Convex functions, Screens, Strings). Test titles: `[f07-schedule] <scenario name>`. Campaign links go to `/campaigns/:id` (f05 route, link only, no code dependency).

## 1. Setup

- [x] 1.1 (frontend) Append namespace `schedule` to `shared/strings/ru.ts` with the keys of design "Strings"; verify `npx tsc --noEmit` and `src/strings-check.test.ts` pass.

## 2. Backend

- [x] 2.1 (backend) Create `convex/schedule.ts` with `schedule.day` per design (requireActor first, `requireDate`, `normalizeId` + NOT_FOUND, working hours only, `hourSlots` per hour, `used` count, `args` and `returns` validators); verify task 4.1 tests pass.

## 3. Frontend

- [x] 3.1 (frontend) Fill `src/routes/Schedule.tsx`: city / billboard / date pickers in URL params (date default today UTC+5, city narrows billboards, clear foreign screen), select-billboard hint, `useGuardedQuery(api.schedule.day, ... | "skip")`, error `Alert` via `errorText`; verify task 4.2 picker tests pass.
- [x] 3.2 (frontend) Hours accordion with `hourRange`, `slotsUsed` and campaign links; 12-slot cycle grid with `slotTime`, `data-state` occupied / free, filled vs outlined style, `<Link>` to `/campaigns/<id>`, «Свободно» from `slot.free`; verify task 4.2 slot tests pass.

## 4. Tests

- [x] 4.1 (backend) `convex/schedule.test.ts`, convex-test with hand-made screens and campaigns: schedule lists the working hours; round-the-clock screen lists 24 hours; opening an hour shows 12 slots (backend: 12 slots, `startSec` 0..55); slots show time and campaign or Свободно (backend slot owners); campaign outside its dates is not shown; partial hour overlap gives each hour its own slots; schedule without a session is refused; invalid date is refused; unknown screen is refused (malformed and deleted id).
- [x] 4.2 (frontend) `src/routes/Schedule.test.tsx`, Testing Library with mocked guarded queries and a memory router: user selects city billboard and date (and refresh keeps URL params); city narrows the billboard picker; date defaults to today; no billboard selected; opening an hour shows 12 slots («00–05 сек.» … «55–60 сек.»); slots show time and campaign or Свободно; occupied and free slots look different; campaign name links to the campaign card; unknown screen is refused (NOT_FOUND text, pickers usable).
- [x] 4.3 (both) Run `npx tsc --noEmit`, `npx vitest run` and the echo checks (authz, wiring, scenarios); verify all pass and every scenario of `schedule` has a test titled `[f07-schedule] <scenario name>`.
