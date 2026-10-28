Depends on: base-contract
Complexity: routine
Reason: one read query over one screen and the locked audience generator, plus a filtered view with cards and a chart; no state, writes or cross-role flow.

# Tasks

## 1. Backend

- [x] 1.1 (backend) Add `convex/analytics.ts` with `screenPeriod` query: args/returns validators, `requireActor` first, date/period validation, `NOT_FOUND {entity:"screen"}`, aggregation of `audienceHour` and `audienceProfile` per design.md; verify with `convex/analytics.test.ts` (convex-test) for the values, vehicles, no camera, per-hour, no personal data and error scenarios.

## 2. Frontend

- [x] 2.1 (frontend) Add the `audience` namespace to `shared/strings/ru.ts` (append only, keys of design.md, team texts marked `// team`); verify `npx tsc --noEmit` and the strings check test pass.
- [x] 2.2 (frontend) Pickers «билборд» and «период» in `src/routes/analytics/Filters.tsx` bound to URL params, defaults per design.md; verify with a Testing Library test.
- [x] 2.3 (frontend) Value cards, «нет камеры» state and terms block in `src/routes/analytics/*` with `<DemoLabel />`; verify with component tests.
- [x] 2.4 (frontend) Per-hour chart (people and looks, 24 points) and age/gender blocks with «предположительно» and the estimate note; verify with component tests.
- [x] 2.5 (frontend) Wire `src/routes/Analytics.tsx` (keep named export `Analytics`) with `useGuardedQuery`; error state shows `errorText`; verify `npx vitest run` passes and no Cyrillic outside `shared/strings`.

## 3. Tests

- [x] 3.1 (backend) convex-test titles `[f08-audience-analytics] <scenario name>` for every backend-observable scenario of `specs/audience-screen/spec.md`; verify `npx vitest run convex` passes.
- [x] 3.2 (frontend) Testing Library titles `[f08-audience-analytics] <scenario name>` for the UI scenarios (no camera, vehicles hidden, age/gender note, terms, demo label, no person image, NOT_FOUND text); verify `npx vitest run src` passes and the echo `check-scenarios` check finds every scenario.
