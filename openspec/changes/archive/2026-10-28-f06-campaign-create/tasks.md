Depends on: base-contract
Complexity: hard
Reason: server-side slot conflict check per screen × day × hour under concurrent saves, plus a rate-limited file upload with validation

# Tasks

Spec: `campaign-create`. Design: `design.md` (Convex functions, Screens, Strings). Test titles: `[f06-campaign-create] <scenario name>`. Reuse `convex/lib` (`findConflicts`, `plannedShows`, `plannedShowsForDay`, `requireDate`, `diffDays`, config constants); do not re-implement slot or plan math. Append only to `convex/campaigns.ts` (shared with f05).

## 1. Backend

- [x] 1.1 (backend) In `convex/campaigns.ts` add the private helpers `validateRequest` and `checkCreative` and the constant `MAX_CONFLICTS = 1000` per design; verify with the convex-test cases of 1.5.
- [x] 1.2 (backend) Add `campaigns.checkAvailability` (query, args/returns validators per design, `requireActor` first); verify `[f06-campaign-create] planned shows example from the SoW`, `preview clipped to working hours`, `slot taken on the same screen and hour`, `other screen or hour is free`, `end date before start date`, `check without a session` pass.
- [x] 1.3 (backend) Add `campaigns.create` (mutation; order: session → input → creative → conflicts → insert; `fail("SLOT_CONFLICT", { conflicts })` capped at `MAX_CONFLICTS`; no `showLog` writes); verify the create scenarios of 1.5 pass.
- [x] 1.4 (backend) Add `campaigns.generateUploadUrl` (mutation: `requireActor` → `enforceRateLimit(ctx, "upload", args.sessionId)` → `ctx.storage.generateUploadUrl()`); add one `CASES` row `{ fn: "campaigns.generateUploadUrl", limit: "uploadUrlPerUser", call, prepare }` in `convex/security.test.ts` (prepare signs in a session); verify `[security] campaigns.generateUploadUrl is rate limited` passes.
- [x] 1.5 (backend) Write `convex/campaigns.create.test.ts` (convex-test, seeded screens, synthetic campaigns, `vi.useFakeTimers` for today) with one test per backend scenario: `placeholder campaign is saved`, `empty name is rejected`, `period over 366 days`, `show end hour not after start hour`, `unknown or repeated screen`, `too many slots per cycle`, `unknown placeholder is rejected`, `video campaign is saved`, `video of a wrong type is rejected`, `video over 20 MB is rejected`, `missing video file is rejected`, `video already used by another campaign` (files stored with `ctx.storage.store(new Blob(..., { type }))`), `upload URL for a valid session`, `sixth upload URL in a burst`, `upload URL without a session`, `conflict is re-checked on save`, `conflict blocks the save`, `no shows outside the selected dates and hours` (via `hourSlots` / `plannedShowsForDay`), `saved campaign is in the list and the schedule` (new `convexTest` client reads the row; `hourSlots` shows the name), `new campaign has no log shows`, `create without a session`, `status argument is rejected`; verify `npx vitest run convex` passes.

## 2. Frontend

- [x] 2.1 (frontend) Add namespace `campaignForm` to `shared/strings/ru.ts` with the keys of design «Strings» (team copy); verify `npx tsc --noEmit` and the strings vitest check pass.
- [x] 2.2 (frontend) Add `src/routes/campaigns/conflictList.ts` (pure `{list}` formatter per design) with `conflictList.test.ts` covering `[f06-campaign-create] conflict message names screens and hours` (merged hours, date span, several screens, `andMore`); verify vitest passes.
- [x] 2.3 (frontend) Build `src/routes/campaigns/NewCampaign.tsx` (form, debounced `checkAvailability` preview, creative choice, browser video checks and upload, `useSubmit(create)`, error display with field labels, navigate to `/campaigns` on success); only `useGuardedQuery` / `useGuardedMutation` / `useSubmit`; no Cyrillic outside the strings module; verify tsc and the strings-check test pass.
- [x] 2.4 (frontend) Add the `/campaigns/new` route to `src/shell/AppShell.tsx` (one `<Route>` before `*`) and the «Создать кампанию» link (`campaignForm.create`) to the header of `src/routes/Campaigns.tsx` (one line, additive); verify the app builds (`npm run build`).
- [x] 2.5 (frontend) Write `src/routes/campaigns/NewCampaign.test.tsx` (vitest + Testing Library, mocked Convex hooks) with one test per front scenario: `form shows all fields`, `form opens from the campaigns section`, `field error names the form field`, `slot choice follows the cycle setting`, `form offers the placeholders`, `video of another length is blocked in the browser` (stub `<video>` duration 8 s; assert no `generateUploadUrl` call), `preview is shown before save`, `conflict blocks the save` (form keeps values, shows the message), `form returns to the campaigns list`, `sixth upload URL in a burst` (RateLimited text); verify `npx vitest run src` passes.

## 3. Checks

- [x] 3.1 (both) Run `npx tsc --noEmit`, `npx vitest run` and the echo checks (authz, wiring, dead controls, scenarios, security); verify every scenario of `specs/campaign-create/spec.md` has a test titled `[f06-campaign-create] <scenario name>`.
