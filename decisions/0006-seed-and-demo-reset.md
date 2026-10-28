# 0006. Seed data and «Сбросить демо»

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

F-11: 100 billboards in 4 regions, some «офлайн», some with a camera; most work 07:00–23:00, a few 24/7 (D-2); several advertisers and campaigns, including «Летняя акция» / «Demo Cola» / «Активна», «Открытие магазина» / «Demo Market» / «Активна», «Презентация автомобиля» / «Demo Auto» / «Запланирована» (F-5 AC1); schedules with occupied and free slots; a show log for at least 1 campaign; several notifications; no real brands and no personal data. F-1 AC5: «Сбросить демо» asks for confirmation, deletes user campaigns and restores the seed. D-13: all viewers share one data set. Campaign status comes from the dates (D-6), so a seed with fixed calendar dates would turn «Активна» into «Завершена» as days pass.

## Options

1. **Deterministic seed, dates relative to "today", one reset mutation**: the seed builds all records from a fixed PRNG seed, with campaign dates as offsets from today (for example «Летняя акция» from today − 10 to today + 20 days; «Презентация автомобиля» from today + 5). Reset deletes all domain tables and uploaded files, then runs the same seed function, in one mutation. Pros: statuses are right whenever the reset runs; one code path; atomic. Cons: the dates shown move with the reset day.
2. **Fixed calendar dates around the meeting (2026-10-31)**: Pros: stable dates in screenshots. Cons: statuses go wrong after the campaign dates pass; needs edits before each later demo.
3. **Snapshot import (`npx convex import`) as reset**: Pros: no seed code at reset time. Cons: CLI-only, not a button; same date drift as option 2.

## Decision

Option 1. Seed dates are relative to the reset day (OQ-5, auto). Reason: Auto: recommended answer, 2026-10-28; the statuses «Активна» / «Запланирована» of the named seed campaigns (F-5 AC1) stay right on any reset day.

- `convex/demo.ts` holds `seedData(ctx, today)` (plain function), an `internalMutation` `demo.seed` for the CLI (runs only when `screens` is empty) and a public mutation `demo.reset({ sessionId })` guarded by `requireActor` (ADR-0003). The confirmation dialog is in the front; the mutation itself has no confirm flag.
- Reset deletes `campaigns`, `showLog`, `screenEvents`, `screens` and the stored video files referenced by campaigns (`ctx.storage.delete`), then reseeds. It keeps `demoSessions`.
- Size: 100 screens, about 10–15 campaigns, a few hundred `showLog` rows (log for the 2 active seeded campaigns, past days only, online screens only, under plan; same rules as ADR-0007), about 20–40 screen events. Well under the 16 000 writes limit for one mutation.
- Synthetic content: screen names are codes plus a district word; addresses are generic street-and-number strings that are not tied to real buildings; coordinates are random points near each city centre; images are generic illustrations without people (ADR-0008). Advertisers: «Demo Cola», «Demo Market», «Demo Auto» and other «Demo …» names.
- Distribution of the 100 screens across the 4 regions, the count of offline screens, of 24/7 screens and of camera screens (most screens have a camera, because screens without one show «нет камеры» in analytics, OQ-3 auto, ADR-0005): chosen by the team as demo values (the ТЗ gives none). Recorded in the seed spec, not presented as client facts.

## Consequences

- Reset is one click and atomic; a failed reset leaves the old data (transaction rollback).
- Any viewer can reset and erase another viewer's campaigns; this is what D-13 asks for.
- Seeded campaign IDs change on each reset; links saved before a reset break. Acceptable for the demo.
- A unit test asserts the seed invariants (100 screens, no slot over 12, the 3 named campaigns with the right statuses, log ≤ plan).

## Open questions

None.
