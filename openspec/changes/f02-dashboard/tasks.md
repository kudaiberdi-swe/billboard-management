Depends on: base-contract
Complexity: hard
Reason: aggregates over 100 screens × up to 366 days (occupancy, audience, contacts) in one reactive query, with a new shared D-4 formula reused by f09.

# Tasks

## 1. Backend

- [x] 1.1 (backend) Add `convex/lib/contacts.ts` with `estimateContacts(c, screens, from, to)` per design.md (uses `isOn`, `audienceHour`, `SLOTS_PER_CYCLE`, `datesInRange`); verify with `convex/lib/contacts.test.ts` covering the `campaign-contacts` scenarios.
- [x] 1.2 (backend) Add `convex/dashboard.ts` `summary` query with args/returns validators, `requireActor` first, date/period/screen validation and the composition table of design.md; verify with `convex/dashboard.test.ts` (convex-test) for the card, filter, chart, city block, active list and error scenarios.
- [x] 1.3 (backend) Add `dashboard.notifications` query (`requireActor`, `notifications(...)` from `convex/lib/status.ts`, network-wide); verify with convex-test for the 4 notification scenarios.
- [x] 1.4 (backend) Time `dashboard.summary` on the full seed with a 366-day period in convex-test; verify it stays under 500 ms, else apply the mitigation in design.md Risks and record it with a `// shortcut:` comment.

## 2. Frontend

- [x] 2.1 (frontend) Add the `dashboard` namespace to `shared/strings/ru.ts` (append only, keys of design.md); verify `npx tsc --noEmit` and the strings check test pass.
- [x] 2.2 (frontend) Filters bar in `src/routes/home/Filters.tsx`: «период», «город», «билборд» bound to URL params, default 7 days ending today (UTC+5), billboard options from `screens.options` narrowed by city; verify with a Testing Library test.
- [x] 2.3 (frontend) Cards grid in `src/routes/home/Cards.tsx` (8 cards, `<DemoLabel />` on log shows, contacts, looks); verify with a component test for the label scenario.
- [x] 2.4 (frontend) Occupancy-per-day chart, screens-per-city block, active campaigns list in `src/routes/home/*`; verify with component tests.
- [x] 2.5 (frontend) Notifications list from `dashboard.notifications` using `notifications.*` strings, empty state `dashboard.noNotifications`; verify with a component test.
- [x] 2.6 (frontend) Wire `src/routes/Home.tsx` (keep named export `Home`) with `useGuardedQuery`; error state shows `errorText`; verify `npx vitest run` passes and no Cyrillic outside `shared/strings`.

## 3. Tests

- [x] 3.1 (backend) convex-test titles `[f02-dashboard] <scenario name>` for every scenario in `specs/dashboard/spec.md` and `specs/campaign-contacts/spec.md` that is backend-observable; verify `npx vitest run convex` passes.
- [x] 3.2 (frontend) Testing Library titles `[f02-dashboard] <scenario name>` for the UI scenarios (filters, demo label, chart points, city block, lists, NOT_FOUND text); verify `npx vitest run src` passes and the echo `check-scenarios` check finds every scenario.
