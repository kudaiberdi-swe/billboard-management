Depends on: none
Complexity: routine
Reason: presentation-only change

# Tasks

## 1. Frontend

- [x] 1.1 Add `demo.notice` «Все показатели — демонстрационные данные» to `shared/strings/ru.ts` and regenerate `shared/strings/generated.ts`
- [x] 1.2 Render the notice once at the top of `MantineAppShell.Main` in `src/shell/AppShell.tsx` (quiet text, no `no-print` class)
- [x] 1.3 Remove `<DemoLabel />` from `routes/home/Cards.tsx`, `routes/Billboards.tsx`, `routes/billboards/BillboardCard.tsx`, `routes/Campaigns.tsx`, `routes/campaigns/CampaignCard.tsx`, `routes/analytics/Blocks.tsx`, `routes/reports/ReportView.tsx`
- [x] 1.4 Delete `src/components/DemoLabel.tsx` and the `demo.label` key; keep `DEMO_TEXT` / `DEMO_COLOR` in `theme.ts` only if still used
- [x] 1.5 Check `src/print.css`: the notice prints on the report page above the disclaimer

## 2. Tests

- [x] 2.1 `src/shell/shell.test.tsx`: `[c01-global-demo-notice] notice shows the verbatim text`, `notice shows once on every signed-in page` (all 9 routes), `password screen has no notice`, `no per-value demo label`; delete the old `demo label shows the verbatim text` test
- [x] 2.2 `src/routes/home/home.test.tsx`: `simulated cards carry no demo label` (replaces `simulated cards carry the demo label`)
- [x] 2.3 `src/routes/Billboards.test.tsx`: `list row shows every required field`; `src/routes/billboards/BillboardCard.test.tsx`: `card shows the demo audience`
- [x] 2.4 `src/routes/campaigns/campaigns.test.tsx`: `log values carry no demo label` (replaces `list carries the demo label`), `card shows campaign details`
- [x] 2.5 `src/routes/analytics/analytics.test.tsx`: `audience values carry no demo label` (replaces `all values carry the demo label`)
- [x] 2.6 `src/routes/reports/reports.test.tsx`: `report shows the demo disclaimer`, `report values carry no demo label` (replaces `demo label sits on the simulated values`), `print view keeps the global notice`
- [x] 2.7 `e2e/acceptance.spec.ts`: drop the `demo.label` locator and the `valueOf` split on it; step 3 and the report step expect the notice
- [x] 2.8 Run `tsc`, the full vitest suite and the strings check (no Cyrillic outside the strings module)
