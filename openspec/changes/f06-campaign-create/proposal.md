Status: draft

# Proposal: f06-campaign-create

## Why

SoW §4.6 F-6: the administrator (R-1) creates a campaign on 1 or more screens, sees before saving whether free 5-second slots exist and how many shows are planned, and gets a clear message naming the screens and hours in conflict when they do not. The campaign must then appear in «Рекламные кампании» and «Расписание» and survive a page refresh. This is the only write path for campaigns in the demo (base access matrix: campaigns create only), so the slot rule D-9 must hold on the server, not only in the form.

SoW functions: 4.6

## What Changes

- New Convex functions appended to `convex/campaigns.ts` (shared with f05, distinct names): `campaigns.checkAvailability` (read-only preview: conflicts and planned shows), `campaigns.create` (validates, re-checks conflicts inside the mutation, inserts), `campaigns.generateUploadUrl` (upload URL for the optional 5-second video, rate limited by the reserved `upload` flow).
- New route `/campaigns/new` with the campaign form, a live availability and planned-shows preview, placeholder or video creative, and the conflict message built from `SLOT_CONFLICT` data. Additive route entry in `src/shell/AppShell.tsx` (orchestrator decision G-2) and a «Создать кампанию» link on the campaigns list page.
- New strings namespace `campaignForm` in `shared/strings/ru.ts`.
- One `CASES` row for `campaigns.generateUploadUrl` in `convex/security.test.ts`.
- All slot, conflict, planned-shows and date math reuses the locked `convex/lib` functions (`findConflicts`, `plannedShows`, `plannedShowsForDay`, `requireDate`, `datesInRange`, `kzNow`) and constants (`SLOTS_PER_CYCLE`, `SLOT_SECONDS`, `CYCLE_SECONDS`, `PLACEHOLDER_KEYS`, `VIDEO_TYPES`, `VIDEO_MAX_BYTES`, `MAX_PERIOD_DAYS`).

## Capabilities

### New Capabilities

- `campaign-create`: campaign form, availability and planned-shows preview, server-side slot conflict check, creative choice and video upload, saving a campaign.

### Modified Capabilities

None. The change uses `slot-model`, `statuses`, `demo-access`, `demo-data` and `app-shell` as they are.

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.6.1 | form shows all fields |
| 4.6.1 | placeholder campaign is saved |
| 4.6.2 | slot choice follows the cycle setting |
| 4.6.2 | too many slots per cycle |
| 4.6.3 | form offers the placeholders |
| 4.6.3 | video campaign is saved |
| 4.6.3 | video of another length is blocked in the browser |
| 4.6.3 | video of a wrong type is rejected |
| 4.6.4 | planned shows example from the SoW |
| 4.6.4 | preview is shown before save |
| 4.6.5 | slot taken on the same screen and hour |
| 4.6.5 | other screen or hour is free |
| 4.6.5 | conflict is re-checked on save |
| 4.6.6 | conflict blocks the save |
| 4.6.6 | conflict message names screens and hours |
| 4.6.7 | no shows outside the selected dates and hours |
| 4.6.8 | saved campaign is in the list and the schedule |
| 4.6.8 | form returns to the campaigns list |
| 4.6.9 | new campaign has no log shows |

## Out of scope

- Editing or deleting a campaign (base access matrix: create only; reset is the only delete).
- The campaigns list page and the campaign card `/campaigns/:id` (f05-campaign-list, decision G-1). F-6 only adds the link to the form and returns to the list after save.
- Videos longer or shorter than 5 seconds (SoW §9.6); server-side duration checks (decision G-7: the browser checks duration, the server checks type and size).
- Prices, payments, advertiser accounts (SoW §9.3, §9.5, §9.8).
- Any change to the base schema, error codes, rate limits or shared pure functions.

## Impact

- Code: `convex/campaigns.ts` (append), `convex/security.test.ts` (one row), `src/shell/AppShell.tsx` (one route), `src/routes/Campaigns.tsx` (one link), new `src/routes/campaigns/NewCampaign*.tsx`, `shared/strings/ru.ts` (new namespace `campaignForm`).
- APIs: 3 new public Convex functions (above). No new tables, fields, indexes, error codes or dependencies.
