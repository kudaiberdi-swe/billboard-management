Depends on: base-contract
Complexity: routine
Reason: two read-only queries and a list plus detail screen over base tables and locked lib math; no writes, no state machine.

# Tasks

## 1. Backend

- [ ] 1.1 [backend] Create `convex/campaigns.ts` with the exported `campaignStatus` return validator and a private summary helper (status via `campaignStatus` + `kzNow`, cities, `plannedShows` total, log sum via `showLog.by_campaign`); verify with `npx tsc --noEmit`.
- [ ] 1.2 [backend] Add `campaigns.list` (`requireActor` first, newest first, `args`/`returns` validators per design.md); verify the list tests in 1.4 pass.
- [ ] 1.3 [backend] Add `campaigns.get` (`requireActor` first, `normalizeId` -> `NOT_FOUND {entity:"campaign"}`, per-screen planned/log, video URL); verify the card tests in 1.5 pass.
- [ ] 1.4 [backend] `convex/campaigns.test.ts` (convex-test, seeded with `seedData`, fixed clock): `[f05-campaign-list] seed has the three named campaigns`, `newest campaign comes first`, `row shows all campaign fields`, `log shows are the sum of the show log`, `campaign without log shows zero`, `status before the start date`, `status between start and end`, `status after the end date`, `seed has no real brand names`, `list without session is refused`; verify `npx vitest run convex/campaigns.test.ts` passes.
- [ ] 1.5 [backend] Card tests in the same file: `[f05-campaign-list] per screen values add up to the totals`, `offline screen is marked on the card` (query result), `card with a malformed id`, `card of a deleted campaign` (backend part: NOT_FOUND after reset), `card without session is refused`; verify vitest passes.

## 2. Frontend

- [ ] 2.1 [frontend] Add namespace `campaigns` to `shared/strings/ru.ts` (keys in design.md; append only); verify the strings check test passes.
- [ ] 2.2 [frontend] Fill `src/routes/Campaigns.tsx`: table from `useGuardedQuery(api.campaigns.list, {})`, status via `status.*`, cities via `cities.*`, name links to `/campaigns/:id`, empty message, `<DemoLabel />`; verify component tests in 2.4.
- [ ] 2.3 [frontend] Add `src/routes/campaigns/CampaignCard.tsx` (`useParams` id -> `campaigns.get`; details, creative from `public/demo/creatives/<key>.*` or the video URL, screens table, `<DemoLabel />`, NOT_FOUND text + «К списку кампаний») and one `<Route path="/campaigns/:id">` in `src/shell/AppShell.tsx`; verify component tests in 2.5.
- [ ] 2.4 [frontend] Component tests (vitest + Testing Library, mocked query): `[f05-campaign-list] empty list shows a message`, `row name opens the card`, `list carries the demo label`; verify vitest passes.
- [ ] 2.5 [frontend] Component tests: `[f05-campaign-list] card shows campaign details`, `card of a deleted campaign` (front part: NOT_FOUND text and back link); verify vitest passes.

## 3. Integration

- [ ] 3.1 [both] Run `npx tsc --noEmit`, `npx vitest run` and the echo checks (authz, wiring, scenarios, dead controls); verify all pass.
