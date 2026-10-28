# 0007. «Смоделировать показы» show log

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

F-10: the campaign card has «Смоделировать показы». It creates log entries only for planned slots in the past part of the campaign period, on screens with status «онлайн». Shows by the log never exceed planned shows. The report and the dashboard show the new values. F-6 AC9: a new campaign has 0 shows by the log until the action runs. ТЗ §12: no invented "actual shows" without an explicit action. F-9 needs shows per day and per screen.

## Options

1. **Aggregated rows per campaign × screen × day, replaced on each run**: Pros: a 30-day campaign on 10 screens is 300 rows; reads for the report and dashboard are small; re-running cannot double the log. Cons: no per-show detail (not needed by any feature).
2. **One row per show**: Pros: realistic. Cons: 720 rows per screen per day for 1 slot; quickly over write and scan limits.
3. **Computed on read, no storage, with a "simulated" flag on the campaign**: Pros: no rows. Cons: the log is no longer a separate record from the plan, which weakens the "plan vs log" separation the product is built on (PRODUCT.md Positioning).

## Decision

Option 1. Mutation `showLog.simulate({ sessionId, campaignId })`, guarded by `requireActor`:

- deletes the campaign's existing `showLog` rows;
- for each screen of the campaign with status `online`, and each day from the start date up to today (in UTC+5), takes the planned shows for that day (for today, only hours already finished) and writes `shows = floor(planned × f)`, where `f` is a deterministic factor in 0.85–1.0 from the hash of (campaign, screen, date);
- writes nothing for a campaign that has not started (the front shows a message from `src/strings.ts`).

Because `f ≤ 1` and the input is the planned count, log ≤ plan always holds (F-10 AC3). The seed uses the same function for the seeded log (ADR-0006).

## Consequences

- Re-running is idempotent for the same day and moves forward as days pass.
- If a screen's status is «офлайн», its days get no log rows, so completion % drops; this shows the plan-vs-log story honestly.
- A unit test asserts log ≤ plan and no rows outside dates, hours or past time.

## Open questions

None.
