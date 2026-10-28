Depends on: base-contract, f02-dashboard, f05-campaign-list
Complexity: routine
Reason: read-only report over base tables built from locked lib math and the f02 contacts helper, plus filters and a print stylesheet; no writes, no state machine, no cross-role flow.

# Tasks

## 1. Backend

- [ ] 1.1 [backend] Create `convex/reports.ts` with `reports.campaign` (`requireActor` first; validation, selection and composition steps 1-9 of design.md; `args`/`returns` validators; imports `estimateContacts` from `convex/lib/contacts.ts`, never re-derives it); verify `npx tsc --noEmit`.
- [ ] 1.2 [backend] `convex/reports.test.ts` (convex-test, `seedData`, fixed clock): `[f09-reports] report shows all values`, `contacts match the dashboard helper`, `screen without a camera adds no analytics`, `completion follows the formula` (inserted plan/log fixture), `zero plan shows a dash` (backend part: `completion` null), `seeded campaign has a full report`; verify `npx vitest run convex/reports.test.ts` passes.
- [ ] 1.3 [backend] Same file, filters and refusals: `[f09-reports] filter by period narrows the report`, `filter by city narrows the report`, `filter by billboard narrows the report`, `report without session is refused`, `report of a deleted campaign` (backend part), `period end before start is refused`, `malformed date is refused`, `billboard outside the campaign is refused`; verify vitest passes.

## 2. Frontend

- [ ] 2.1 [frontend] Add namespace `reports` to `shared/strings/ru.ts` (keys in design.md, SoW texts verbatim; append only); verify the strings check test passes.
- [ ] 2.2 [frontend] Filters in `src/routes/reports/ReportFilters.tsx` (URL search params `campaign`, `from`, `to`, `city`, `screen`; picker from `campaigns.list`; city/screen options from `options`; wrapped in `no-print`); verify the filter component tests in 2.5.
- [ ] 2.3 [frontend] Fill `src/routes/Reports.tsx` and `src/routes/reports/*`: disclaimer first, `<DemoLabel />`, header, block «Результаты размещения» (values, per-day chart, per-screen table), block «Аналитика экранов», «—» for null completion, error text from `useGuardedQuery` errors, «Печать / сохранить в PDF» button (`no-print`, calls `window.print()`); verify component tests in 2.5.
- [ ] 2.4 [frontend] Extend `src/print.css` (`@page` A4 portrait, `.report-block` no break inside, `.report-chart` fixed width); verify the print test in 2.5.
- [ ] 2.5 [frontend] Component tests (vitest + Testing Library, mocked queries): `[f09-reports] filters live in the URL`, `no campaign selected`, `report has two separate blocks`, `report shows the demo disclaimer`, `zero plan shows a dash` (front part), `report of a deleted campaign` (front part), `print button opens the print dialog` (spy on `window.print`), `print view hides menu and filters` (filters and button carry `no-print`, disclaimer and blocks do not; print.css has the `@page` and `break-inside` rules), `no label claims a confirmed audience` (scan of `ru.reports`); verify vitest passes.

## 3. Integration

- [ ] 3.1 [both] Run `npx tsc --noEmit`, `npx vitest run` and the echo checks (authz, wiring, scenarios, dead controls); verify all pass.
