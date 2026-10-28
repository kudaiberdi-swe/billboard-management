# Design: f06-campaign-create

## Context

See proposal.md (Why). The base contract is locked: the `campaigns` table, the `creative` validator, `requireActor`, `fail` and the error codes `INVALID_INPUT`, `SLOT_CONFLICT`, `INVALID_CREATIVE`, `UNAUTHENTICATED`, the reserved `upload` rate-limit flow (`enforceRateLimit(ctx, "upload", sessionId)`), and the pure functions in `convex/lib` (`findConflicts`, `plannedShows`, `plannedShowsForDay`, `requireDate`, `diffDays`, `kzNow`). ADR-0008 fixes the upload flow. `convex/campaigns.ts` is shared with f05-campaign-list (append-only, distinct names, decision G-1). Requirements: `specs/campaign-create/spec.md`.

## Goals / Non-Goals

**Goals:** one server-side validation path shared by the preview query and the create mutation; conflict check repeated inside the create transaction; no slot or plan math outside `convex/lib`.

**Non-Goals:** editing campaigns; server-side video duration; deleting orphan uploads; the campaign card page (f05).

## Convex functions

All functions take `sessionId: v.string()` (added by `useGuardedQuery` / `useGuardedMutation`; not listed in Args) and call `requireActor(ctx, args.sessionId)` first. Every function has `args` and `returns` validators. Role: `admin` (R-1, every valid demo session). Permissions from the base yaml: `campaigns.read` (check), `campaigns.create` (create), `campaigns.uploadCreative` (upload URL).

| Function | Kind | Args | Returns | Roles | Notes |
|----------|------|------|---------|-------|-------|
| `campaigns.checkAvailability` | query | `{ startDate: v.string(), endDate: v.string(), startHour: v.number(), endHour: v.number(), slotsPerCycle: v.number(), screenIds: v.array(v.id("screens")) }` | `{ conflicts: Conflict[]; conflictCount: number; perDay: number; total: number; byScreen: Array<{ screenId: Id<"screens">; perDay: number }> }` | admin | Read-only. Runs `validateRequest` (below), then `findConflicts(req, screens, campaigns)` over all screens and all campaigns. `conflicts` capped at `MAX_CONFLICTS` (1000); `conflictCount` is the full count. `byScreen[i].perDay = plannedShowsForDay(draft, s, startDate)`; `perDay` = their sum; `total = plannedShows(draft, screens, startDate, endDate).total`. Throws `INVALID_INPUT { field }`, `UNAUTHENTICATED`. |
| `campaigns.create` | mutation | `{ name: v.string(), advertiser: v.string(), startDate, endDate, startHour, endHour, slotsPerCycle, screenIds` (same validators as above) `, creative }` (`creative` = schema export) | `Id<"campaigns">` | admin | Order: `requireActor` → `validateRequest` + name/advertiser trimmed 1..200 chars (`INVALID_INPUT` field `name` / `advertiser`) → `checkCreative` (`INVALID_CREATIVE`) → `findConflicts` inside the same transaction; non-empty → `fail("SLOT_CONFLICT", { conflicts: first MAX_CONFLICTS })` → insert. No `status` arg (validator rejects extra fields). Writes no `showLog`. |
| `campaigns.generateUploadUrl` | mutation | `{}` | `string` | admin | `requireActor` → `enforceRateLimit(ctx, "upload", args.sessionId)` (throws `RateLimited`) → `ctx.storage.generateUploadUrl()`. Name fixed by base design D3a. |

Read only by the form (existing): `screens.options` (picker, base).

Private helpers in `convex/campaigns.ts` (not exported as functions, not in `convex/lib`, which is locked):

- `validateRequest(ctx, args) => { req, screens: ScreenRule[], campaigns: CampaignRule[] }`: `requireDate` on both dates; `endDate >= startDate` else field `endDate`; `diffDays(startDate, endDate) + 1 <= MAX_PERIOD_DAYS` else `endDate`; `startHour` integer 0..23 else `startHour`; `endHour` integer 1..24 and `> startHour` else `endHour`; `slotsPerCycle` integer 1..`SLOTS_PER_CYCLE` else `slotsPerCycle`; `screenIds` length 1..100, unique, each `ctx.db.get` non-null else `screenIds`. Loads all screens and all campaigns (scan, ~10-15 campaigns per base design).
- `checkCreative(ctx, creative, campaigns)`: placeholder key in `PLACEHOLDER_KEYS`; video: `ctx.db.system.get(storageId)` exists, `contentType` in `VIDEO_TYPES`, `size <= VIDEO_MAX_BYTES`, no existing campaign has the same `storageId`; else `fail("INVALID_CREATIVE")`.
- Draft campaign for `plannedShows*` (they take a `CampaignRule`): the request fields plus `name: ""`; `_id` and `_creationTime` are not read by the plan math, so a typed cast is acceptable with a one-line comment.

## Data

None. Uses `campaigns`, `screens` and `_storage` system metadata from the base contract. No new tables, fields or indexes.

## Screens

| Screen | Route | Role | Functions called |
|--------|-------|------|------------------|
| Campaign form | `/campaigns/new` (`src/routes/campaigns/NewCampaign.tsx`, named export `NewCampaign`) | R-1 | `screens.options`, `campaigns.checkAvailability` (debounced ~300 ms, `"skip"` until dates, hours, slots and ≥1 screen are filled), `campaigns.generateUploadUrl`, `campaigns.create` |
| «Создать кампанию» link | header of `/campaigns` (`src/routes/Campaigns.tsx`, owned by f05; F-6 adds one link line) | R-1 | none |

Form layout (Mantine): `TextInput` name, `TextInput` advertiser, `DatePickerInput` start / end (dayjs `ru`), `MultiSelect` screens (`{code} {name}`, searchable), `Select` start hour 0..23 and end hour 1..24 shown as `HH:00`, `Select` slots 1..`SLOTS_PER_CYCLE`, creative `SegmentedControl` placeholder / video with 4 placeholder images from `public/demo/creatives/placeholder-N.svg` and a `FileInput` (`accept="video/mp4,video/webm"`). Preview panel below: availability line, planned shows per screen per day (table), per day, for the period. Save button «Сохранить» uses `useSubmit(create)`; on success `navigate("/campaigns")`. The form keeps the entered values on any error.

Video flow (ADR-0008, decision G-7): on file pick the browser checks `file.type` in `VIDEO_TYPES`, `file.size <= VIDEO_MAX_BYTES`, and `<video>` metadata `duration` in 4.5–5.5 s; on failure show `errors.INVALID_CREATIVE`, request no URL. Else call `generateUploadUrl`, `fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file })`, keep `{ kind: "video", storageId }` in form state (one upload per picked file, so conflict retries do not spend the upload rate limit).

Conflict message (`SLOT_CONFLICT`, F-6 owns the `{list}` format): a pure front helper `conflictList(conflicts, screens)` in `src/routes/campaigns/conflictList.ts`: group by screen, order by screen code; per screen `{code} {name}: {dates}, {hours}` where `{dates}` = earliest–latest conflict date as `DD.MM.YYYY–DD.MM.YYYY` (one date when equal) and `{hours}` = the union of conflict hours merged into ranges `HH:00–HH:00` (end = last hour + 1), joined by `, `; screens joined by `; `. The preview uses the same helper with `checkAvailability.conflicts`; when `conflictCount > conflicts.length` it appends `campaignForm.andMore`. `INVALID_INPUT` shows `errors.INVALID_INPUT` with `{field}` = `campaignForm.fields.<field>`.

Route: one additive `<Route path="/campaigns/new" element={<NewCampaign />} />` inside `<Routes>` of `src/shell/AppShell.tsx`, before the `*` route (decision G-2). The menu marks «Рекламные кампании» by `startsWith`.

## Strings

New namespace `campaignForm` in `shared/strings/ru.ts` (append only). All values are team copy (`team`); the SoW gives the fields in English only. Keys: `title` «Новая кампания», `create` «Создать кампанию», `save` «Сохранить», `cancel` «Отмена», `fields.name` «Название», `fields.advertiser` «Рекламодатель» (SoW R-2 term), `fields.startDate` «Дата начала», `fields.endDate` «Дата окончания», `fields.screenIds` «Экраны», `fields.startHour` «Начало показа», `fields.endHour` «Конец показа», `fields.slotsPerCycle` «Слотов в минутном цикле», `fields.creative` «Креатив», `slotsHint` «1 слот = {slot} сек. в цикле {cycle} сек.», `creativePlaceholder` «Готовый макет», `creativeVideo` «Видео 5 сек.», `fits` «Свободных слотов достаточно», `plannedTitle` «Запланированные показы» (glossary «запланированные показы»), `perScreenPerDay` «На экран в день», `perDay` «Всего в день», `perPeriod` «За период», `andMore` «и другие», `uploading` «Загрузка видео…». Errors reuse `errors.*` from the base.

## Decisions

1. **Name `campaigns.checkAvailability`**, not the pack's suggested `campaigns.check`: it is the name in `decisions/ARCHITECTURE.md` and the base proposal; distinct from f05's `list` / `get`.
2. **One validation helper for preview and save.** Alternative: validate only in `create`. Rejected: the preview would show plan numbers for invalid input.
3. **Conflicts re-checked inside `create`.** The mutation reads all campaigns, so a concurrent create that takes the same slots invalidates the read set and Convex OCC re-runs the mutation, which then fails with `SLOT_CONFLICT`. No lock needed.
4. **Cap `conflicts` at `MAX_CONFLICTS = 1000`** (local constant): a 100-screen × 366-day × 24-hour request could produce ~880 000 conflicts, over the Convex 8 192-item array limit. shortcut: the create error carries only the first 1000 (screen-major order, so late screens may be missing from the message); the preview shows the full count.
5. **Upload on file pick**, not on save: one URL per file; retries after a conflict do not consume the `upload` bucket (capacity 5).
6. **Rejected video files are not deleted.** ADR-0008 says "deletes the file and rejects", but a mutation that throws rolls back its own `ctx.storage.delete`. The browser checks block normal bad files; only crafted calls leave an orphan, and the upload rate limit bounds them.
7. **Return to `/campaigns` after save** (not the f05 card), so F-6 has no function dependency on f05.

## Risks / Trade-offs

- [Orphan uploads from rejected or abandoned forms stay in storage; `demo.reset` deletes only videos referenced by campaigns] → bounded by the upload rate limit; a reset-time sweep of unreferenced `_storage` files would be a base change (`demo.reset`), not done here.
- [The conflict scan is O(screens × days × hours × campaigns); worst case ~13 M steps for 100 screens × 366 days] → fine at seed size; the preview is debounced.
- [Merge friction on `convex/campaigns.ts`, `src/routes/Campaigns.tsx`, `AppShell.tsx`, `ru.ts`, `security.test.ts`] → append-only edits, one line each where possible.
- [Server does not verify video duration] → stated in the spec (decision G-7); shortcut comment in `checkCreative`.

## Open Questions

- TODO(client): may a campaign start in the past? The SoW sets no rule; the demo allows any dates (status is computed, D-6).
- TODO(client): the Russian labels of the form fields (team copy above until the client confirms).
- TODO(client): the commercial slot model (Q-04); the demo uses D-1.
