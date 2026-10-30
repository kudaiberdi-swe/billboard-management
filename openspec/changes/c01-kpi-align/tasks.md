Depends on: base-contract
Complexity: routine
Reason: one-line layout fix on the «Главная» KPI card, no backend, no contract change

# Tasks

## 1. Frontend

- [x] 1.1 (frontend) In `src/routes/home/Cards.tsx:49`, change the card `Stack` to `<Stack gap="xs" align="flex-start" h="100%" justify="space-between">`, as in `src/routes/analytics/Blocks.tsx:50`; no label truncation. Verify: `tsc` passes and `src/routes/home/home.test.tsx` (existing `[f…]` card tests) still passes in vitest.

## 2. Tests

- [x] 2.1 (frontend) Add a Playwright e2e test `[c01-kpi-align] card values line up per row` with tag `@c01-kpi-align` in `e2e/`: sign in as R-1, open `/` at a desktop viewport where the «Занятость рекламного инвентаря» label wraps to 2 lines and «Экраны в сети» fits 1 line (assert the label heights differ first), then for each row of 4 cards assert the value elements' bounding-box bottoms are equal within 1px, the 4 card heights are equal within 1px, and every label shows its full text (`scrollHeight <= clientHeight`, no ellipsis). Verify: `npx playwright test --grep @c01-kpi-align` passes, and fails on the code before 1.1.
- [x] 2.2 (both) Link the 3 unchanged scenarios copied into this delta, as round c00 did: add `test("[c01-kpi-align] cards show the network values", cardsShowTheNetworkValues)` in `src/routes/home/home.test.tsx`, and `[c01-kpi-align] screen looks card sums looks` / `[c01-kpi-align] no session is refused` next to the existing aliases in `convex/dashboard.test.ts:138-150`, reusing the same test functions. Verify: vitest passes.
- [x] 2.3 (frontend) Run `tsc`, the full vitest suite and the echo checks (`check-scenarios` finds the new scenario test). Verify: all pass.
