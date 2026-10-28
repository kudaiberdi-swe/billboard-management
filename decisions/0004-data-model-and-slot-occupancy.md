# 0004. Data model and slot occupancy

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

- 100 screens in 4 regions (SoW F-3, F-11). Working hours: most 07:00–23:00, a few 24/7 (D-2).
- Cycle: 60 s with 12 slots of 5 s; cycle length is one setting (D-1).
- A campaign has dates, 1 or more screens, show hours and a number of slots per cycle (F-6 AC1). The user picks a count, not slot positions (ТЗ §8 п.6).
- Conflict check per screen × day × hour, 12 slots (D-9, F-6 AC5, AC6). The schedule shows per hour the 12 slots with the campaign name or «Свободно»; each hour shows its own slot set (F-7).
- Planned shows per screen per day = slots per cycle × 60 × show hours inside working hours (F-6 AC4).
- Occupancy % = occupied slots / all slots in working hours of the selected screens for the period × 100 (D-3).
- Status of a campaign comes from the dates (D-6); data must agree across sections (F-4 AC2, F-11 AC4).
- Campaign edit and delete are not in the SoW; «Сбросить демо» removes user campaigns (F-1 AC5).
- Convex per-function limits (docs.convex.dev/production/state/limits, verified 2026-10-28): 32 000 documents scanned, 4 096 index ranges, 16 MiB read, 16 000 documents written, 1 s of user-code time for a query or mutation.

Materialising occupancy as rows per screen × day × hour costs 100 screens × 16–24 h × each day (about 48 000 rows for one month), which is over the scan limit for one dashboard query and must be rewritten on every reset.

## Options

1. **Compact rules, computed occupancy**: a campaign stores its rule once (dates, hours, slot count, screen IDs). Occupancy, the 12-slot view, planned shows and conflicts are computed on read by pure functions in `convex/lib/slots.ts`. Pros: tiny data (tens of documents), no sync between tables, reset is cheap, the card and the schedule cannot disagree because they call the same function. Cons: CPU per query grows with screens × days × hours × campaigns on a screen; fine at demo size, needs measuring with long periods.
2. **Materialised slot rows** (`slotAssignments` per screen × day × hour × campaign): Pros: simple per-hour reads. Cons: thousands of writes per campaign, scan limit hit by dashboard ranges, heavy reset.
3. **Compact rules + link table** (`campaignScreens` with index by screen): like 1, with indexed lookup per screen. Pros: scales to many campaigns. Cons: one more table to keep in step; not needed for tens of campaigns.

## Decision

Option 1. Tables (field names are a draft for the base contract):

- `screens`: `code` (for example `AST-001`), `name`, `city` (code: `astana`, `karaganda`, `atyrau`, `east_kz`), `address`, `lat`, `lng`, `status` (`online` / `offline`), `workStartHour`, `workEndHour` (0–24, end exclusive; 24/7 is 0–24), `hasCamera`, `hasVehicleMetric`, `imageKey`.
- `campaigns`: `name`, `advertiser` (text; no advertisers table), `startDate`, `endDate` (`YYYY-MM-DD`, inclusive), `startHour`, `endHour` (whole hours, end exclusive), `slotsPerCycle` (1–12), `screenIds` (array of screen IDs), `creative` (`{ kind: "placeholder", key }` or `{ kind: "video", storageId }`, ADR-0008). No status field: status is computed from the dates (D-6).
- `showLog`: `campaignId`, `screenId`, `date`, `shows` (one row per campaign × screen × day; ADR-0007). Indexes `by_campaign`, `by_date`.
- `screenEvents`: `screenId`, `at`, `kind` (`went_offline`, `back_online`). Index `by_screen`. Feeds "recent events" on the card (F-4).
- `demoSessions` (ADR-0003). No table for analytics (ADR-0005) and none for notifications: «Экран недоступен» and «Кампания скоро завершится» are computed from `screens.status` and `campaigns.endDate` (D-5).

Rules in `convex/lib/`:

- `config.ts`: `CYCLE_SECONDS = 60`, `SLOT_SECONDS = 5`, so `SLOTS_PER_CYCLE = 12` and `CYCLES_PER_HOUR = 60`. This constant is the "one setting" of D-1; there is no settings UI in the SoW, so no settings table.
- `time.ts`: all dates and hours are Kazakhstan local time, a fixed UTC+5 offset (Kazakhstan moved to one zone UTC+5 on 2024-03-01; verified 2026-10-28). Fixed-offset math avoids depending on the tzdata version of the browser or server. "Today" = `Date.now()` + 5 h.
- `slots.ts`: a campaign is "on" for screen S, date d, hour h when S is in `screenIds`, d is in the dates, h is in the show hours and h is in the screen's working hours. In one hour, the on-campaigns fill slots 1..12 in campaign creation order; the rest are «Свободно». The composition is the same for every minute of that hour (allowed by ТЗ §9).
- Conflict check: for each selected screen, take only the campaigns on that screen with overlapping dates, then loop days × hours: used + requested must be ≤ 12. It runs in the `campaigns.create` mutation (authoritative; Convex mutations are transactional, so two parallel saves cannot both pass) and in a `campaigns.checkAvailability` query for the form preview. The result lists conflicts as screen, date and hour; the front groups them into ranges for the message (F-6 AC6).
- Campaign edit and delete (OQ-4): not built in phase 1; «Сбросить демо» covers cleanup (auto). Reason: Auto: recommended answer, 2026-10-28; not in F-5 or F-6, and the 3-day deadline (K-01).
- Input validation in `campaigns.create`: name and advertiser non-empty, `startDate ≤ endDate`, period ≤ 366 days, `0 ≤ startHour < endHour ≤ 24`, `1 ≤ slotsPerCycle ≤ 12`, 1–100 existing screen IDs, creative valid.

## Consequences

- Seed and reset write only a few hundred documents (ADR-0006).
- Every view (dashboard, list, card, schedule, report) reads screens (100) and campaigns (all) and computes; one source of truth, F-11 AC4 holds by construction.
- shortcut: queries scan all campaigns; fine up to a few thousand campaigns (scan limit 32 000); move to option 3 (link table with index by screen) in phase 2.
- CPU risk: a dashboard over a long period loops screens × days × hours. Check with a 366-day period in a unit benchmark; if it is near the 1 s limit, cap dashboard periods or sum per day in closed form.
- Status computed from `Date.now()` in a query can be stale for a page left open over midnight; a refresh fixes it. Acceptable for the demo.
- Campaign edit and delete are not built (OQ-4, auto). A campaign rule never changes after save; add edit or delete as a change after the demo if the client asks.
- The real commercial slot model is open (Q-04); changing it changes `config.ts` and `slots.ts`, not the tables.

## Open questions

- TODO(client): Q-04 commercial slot model (phase 2).
- TODO(client): Q-06 confirm D-3 and D-4 formulas.
