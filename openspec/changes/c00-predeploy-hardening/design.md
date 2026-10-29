# Design: c00-predeploy-hardening

## Context

The code already exists on branch `predeploy` (see proposal.md, Why). This design records the choices behind it. It adds no new approach. The base contract does not change: the tables, error codes and public function signatures stay the same.

## Convex functions

The front calls these. Each signature is unchanged; only the behaviour notes are new.

| Function | Kind | Args | Returns | Roles | Notes |
|----------|------|------|---------|-------|-------|
| `showLog.simulate` | mutation | `{ sessionId: string, campaignId: Id<"campaigns"> }` | `{ rows: number, from: string, to: string }` | R-1 (valid demo session) | row budget `LOG_ROW_BUDGET` = 20 000; `from` can be later than the 31-day window start; `INVALID_INPUT` `field: "campaignId"` when no day fits |
| `campaigns.checkAvailability` | query | `{ sessionId, startDate, endDate, startHour, endHour, slotsPerCycle, screenIds }` | `{ conflicts (≤ 1 000), conflictCount, byScreen, perDay, total }` | R-1 | dates in 2000–2100 |
| `campaigns.create` | mutation | `{ sessionId, name, advertiser, startDate, endDate, startHour, endHour, slotsPerCycle, screenIds, creative }` | `Id<"campaigns">` | R-1 | dates in 2000–2100; `SLOT_CONFLICT` data shown in the preview panel |
| `dashboard.summary` | query | `{ sessionId, from, to, city?, screenId? }` | summary object (unchanged) | R-1 | log rows read by campaign index per selected campaign (KI-04); same totals |
| `analytics.screenPeriod` | query | `{ sessionId, screenId, from, to }` | unchanged | R-1 | dates in 2000–2100 |
| `reports.campaign` | query | `{ sessionId, campaignId, from?, to? }` | unchanged | R-1 | dates in 2000–2100 |
| `schedule.day` | query | `{ sessionId, screenId, date }` | unchanged | R-1 | date in 2000–2100; the `campaign` URL param is front-only |

Internal, never called by the front:

| Function | Kind | Args | Returns | Notes |
|----------|------|------|---------|-------|
| `campaigns.sweepOrphanUploads` | internalMutation | `{ cursor?: string, before?: number, page?: number }` | `number` (files deleted by this page) | pages of 500, ≤ 40 pages per run, reschedules itself |
| `demo.purgeExpiredSessions` | internalMutation | `{ cursor?: string, now?: number }` | `number` | pages of 500, reschedules itself to the table end |
| `demo.clearOldRateLimits` | internalMutation | `{}` | `null` | rate-limiter `clearAll` with `before` = now − 1 h |

## Data

No new tables or fields. `LOG_ROW_BUDGET`, `SWEEP_PAGE`, `SWEEP_MAX_PAGES` and `SESSION_PAGE` are code constants.

## Screens

- `/campaigns/new`: shows the conflict in the preview panel only (`conflictList.ts` builds the lines). «Сохранить» is disabled while `conflicts` is set.
- `/campaigns` and `/campaigns/:id`: status badge and the `LogShows` zero hint. The card adds the link «Показать в расписании».
- `/schedule`: reads `campaign` from the URL search params, marks its slots and opens its first hour.
- Shell: the button «Выйти» calls `signOut()` in `src/session.ts`.
- `/` («Главная»): 8 cards in a 4-column grid.

## Decisions

- **Row budget instead of stored totals (KI-04).** `campaigns.list` and the unfiltered «Главная» read whole logs in one query, and Convex caps a function at 32 000 documents read. A 20 000-row budget keeps both under that cap with no schema change. Alternative: per-campaign stored totals. That is a schema and contract change, deferred until the log must grow (`shortcut:` comment in `convex/showLog.ts`).
- **Clip to the latest days, refuse only when nothing fits.** The latest days matter most for the demo, so the run keeps them. The run refuses with the existing `INVALID_INPUT` code, so the contract stays as it is.
- **Year window 2000–2100 (KI-05).** A year like 9999 rolled over to "+010000" and broke the string-compare loop. The window holds every demo date. Iteration now uses the day count.
- **Client-side sign-out.** No logout function exists in the contract. Clearing the local id is enough for a shared-password demo. Shortcut noted in `src/session.ts`.
- **Conflict once, in the panel.** One place for the message, and an off button with a reason, instead of a red error under a button that still works.

## Risks / Trade-offs

- [A full log blocks simulation for every other campaign] → «Сбросить демо» restores the seed log, and the log-full message says so.
- [Sign-out leaves a valid server session for up to 7 days] → the id lives only in that browser's storage, which sign-out cleared. The daily purge deletes the row after it expires.
- [The rate-limit cleanup can reset a key that was used in the last hour, once a day] → accepted. Every bucket refills in under 1 hour.

## Pending on the fix branch

- Log-full message: strings key `simulate.logFull`, picked by the button from the error code `INVALID_INPUT` and `field` "campaignId". On `predeploy` the card still shows «Проверьте поле: campaignId.».
- Card screen table: the fix branch restores the code through `screenTitle` (code and name, code once). On `predeploy` the row shows `s.name` only, which holds the code only for seed names.
