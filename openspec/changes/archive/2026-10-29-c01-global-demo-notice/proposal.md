Status: draft

# Proposal: c01-global-demo-notice

## Why

Round c01, user decision of 2026-10-29: the «Демонстрационные данные» chips on single values, cards, columns, blocks and report rows clutter every screen. Replace them with one quiet notice that the app shell shows on every page. The ТЗ §5 rule and acceptance §14.10 («во всех соответствующих разделах указано, что данные демонстрационные») stay met: every section still says its data is demonstration data, once per page instead of once per value.

SoW functions: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8, 4.9

## What Changes

- `app-shell`: the per-value label component is gone. The shell shows one global notice «Все показатели — демонстрационные данные» at the top of the content area of every signed-in page: the 6 sections and the detail pages `/billboards/:id`, `/campaigns/:id`, `/campaigns/new`. The password screen has no notice. No page shows a separate «Демонстрационные данные» label.
- `dashboard`, `billboard-list`, `billboard-card`, `campaign-list`, `campaign-card`, `audience-screen`: simulated values carry no label of their own. The global notice covers them.
- `reports`: the report values carry no label of their own. The disclaimer «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват» stays verbatim at the top and in print (ТЗ §11). The global notice also prints: the printed report shows both the notice and the disclaimer.
- Unchanged: the separation of plan, log and audience values («Результаты размещения» vs «Аналитика экранов»), the estimate notes («предположительно», algorithm estimate), «нет камеры», and every number.

Not in scope: backend, data, contract, and wording of the disclaimer. The `Purpose` lines of `app-shell` and `audience-screen` still mention the label. A delta cannot change them, so they need a manual edit at archive time.

## Acceptance coverage

Only the criteria this change touches. All other criteria of these functions stay covered by the archived scenarios in `openspec/specs/`.

| Criterion | Scenario |
| --- | --- |
| 4.1.2 | notice shows once on every signed-in page |
| 4.2.4 | simulated cards carry no demo label |
| 4.3.2 | list row shows every required field |
| 4.4.1 | card shows the demo audience |
| 4.5.2 | log values carry no demo label |
| 4.8.5 | audience values carry no demo label |
| 4.9.6 | report shows the demo disclaimer |
| 4.9.7 | print view keeps the global notice |

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `app-shell`: REMOVED «Demo label», ADDED «Global demo notice».
- `dashboard`: REMOVED «Estimated contacts card», ADDED «Estimated contacts card under the global notice».
- `billboard-list`: «Screen list».
- `billboard-card`: «Demo audience on the card».
- `campaign-list`: REMOVED «Demo label on log values», ADDED «Global notice covers log values».
- `campaign-card`: «Card content».
- `audience-screen`: REMOVED «Demo label on all values», ADDED «Global notice covers audience values».
- `reports`: REMOVED «Demo disclaimer», ADDED «Report disclaimer under the global notice», MODIFIED «Browser print».

## Impact

Frontend only: `src/components/DemoLabel.tsx` (removed), `src/shell/AppShell.tsx`, the screens that render the label, `shared/strings/ru.ts` (+ generated strings), the component tests and `e2e/acceptance.spec.ts`.
