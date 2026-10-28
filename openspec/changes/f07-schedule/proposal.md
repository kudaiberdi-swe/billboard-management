Status: draft

# Proposal: f07-schedule

## Why

SoW §4.7 F-7 «Расписание». The network owner (R-1) needs to see which ad runs on a screen and when: pick a city, a billboard and a date, see the working hours, and open an hour to see its 1-minute cycle of 12 five-second slots with the campaign in each slot or «Свободно». The view must follow the shared slot packing of the base contract, so it matches the billboard card (F-4 AC2) and the campaign check (F-6).

SoW functions: 4.7

## What Changes

- New Convex module `convex/schedule.ts` with one query `schedule.day` (screen + date -> working hours, each with its 12 slots from `hourSlots`). One query is enough: a day is at most 24 x 12 slots, so opening an hour is a front-only action (no `schedule.hour` round trip).
- «Расписание» page `/schedule` (`src/routes/Schedule.tsx`): pickers city, billboard, date in URL search params; the hours of the day; an opened hour shows the 12 slots with their time «00–05 сек.» … «55–60 сек.» and the campaign name or «Свободно»; occupied and free slots look different.
- Campaign names are plain router links to `/campaigns/<campaign id>` (route owned by f05-campaign-list). No code dependency on f05: no import, no function call.
- Team default: the date picker starts at today (UTC+5).
- New strings namespace `schedule` in `shared/strings/ru.ts`.

## Capabilities

### New Capabilities
- `schedule`: the «Расписание» view of one screen and day: hours, the 1-minute cycle of each hour, slot times, campaign or «Свободно», links to the campaign card.

### Modified Capabilities
None. `slot-model` is used as it is.

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.7.1 | user selects city billboard and date |
| 4.7.1 | city narrows the billboard picker |
| 4.7.2 | schedule lists the working hours |
| 4.7.2 | opening an hour shows 12 slots |
| 4.7.3 | slots show time and campaign or Свободно |
| 4.7.4 | occupied and free slots look different |
| 4.7.5 | campaign name links to the campaign card |
| 4.7.6 | partial hour overlap gives each hour its own slots |

## Out of scope

- Editing the schedule, moving or assigning slots (campaigns are created only in F-6).
- Several screens or several days in one view, a week or month grid.
- The campaign card page itself (f05-campaign-list) and its «Смоделировать показы» button (f10).
- Show-log values per slot (F-9, F-10); audience values (F-8).
- Mobile layout (SoW §9).

## Impact

- New `convex/schedule.ts`, `convex/schedule.test.ts`.
- `src/routes/Schedule.tsx` (fills the stub), optional `src/routes/schedule/*` parts, `src/routes/Schedule.test.tsx`.
- `shared/strings/ru.ts` (append namespace `schedule`).
- No new dependencies; no AppShell edit (route `/schedule` exists).
