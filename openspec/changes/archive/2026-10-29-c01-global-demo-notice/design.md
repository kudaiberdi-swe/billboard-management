# Design: c01-global-demo-notice

## Context

Today `src/components/DemoLabel.tsx` renders a Mantine `Badge` with `demo.label` («Демонстрационные данные»). It is used in `routes/home/Cards.tsx`, `routes/Billboards.tsx`, `routes/billboards/BillboardCard.tsx`, `routes/Campaigns.tsx`, `routes/campaigns/CampaignCard.tsx`, `routes/analytics/Blocks.tsx` and `routes/reports/ReportView.tsx`. `src/shell/AppShell.tsx` holds the menu (`MantineAppShell.Navbar`, class `no-print`) and the routes inside `MantineAppShell.Main`. `src/print.css` hides `.no-print`.

## Goals / Non-Goals

**Goals:** one notice per signed-in page, rendered once by the shell. No per-value labels. The notice prints.

**Non-Goals:** no backend, data or contract change. No new component library or dismiss state. The disclaimer wording and the plan / log / audience block split stay as they are.

## Convex functions

None. This change calls no new function and changes no signature.

## Data

None.

## Screens

| Screen | Role | Change | Functions |
|--------|------|--------|-----------|
| App shell (all signed-in routes) | R-1 | renders the notice once at the top of `MantineAppShell.Main`, above `<Routes>` | none |
| «Главная», «Билборды», billboard card, «Рекламные кампании», campaign card, «Аналитика аудитории», «Отчёты» | R-1 | drop `<DemoLabel />` | unchanged |
| Password screen | visitor | no notice (rendered by `Gate` outside the shell) | unchanged |

## Decisions

- **Notice text**: «Все показатели — демонстрационные данные» (team copy, user decision 2026-10-29). Key `demo.notice` in `shared/strings/ru.ts`, regenerate `shared/strings/generated.ts`. Remove `demo.label` once nothing reads it. It keeps the words «демонстрационные данные», so ТЗ §5 and acceptance §14.10 are still met.
- **Placement**: in the shell, not on each page. One render point means no screen can forget it. It sits in `Main`, not in the `Navbar`, so it is not `no-print` and stays visible on the printed report.
- **Print**: the printed report shows both the notice and the disclaimer. The notice was not dropped and the disclaimer does not replace it, because the shell renders the notice the same way on every page and print needs no special case.
- **Look**: quiet secondary text (Mantine `Text size="sm" c="dimmed"`, or the existing `DEMO_TEXT` colour), no badge, no close button. Accessible: plain text, read by screen readers, not `aria-hidden`.
- **Alternative rejected**: keep `DemoLabel` and render it once per page. That repeats the call on 9 routes and makes a missing label possible.

## Risks / Trade-offs

- [Renamed scenarios break their test links] → each renamed scenario gets a new test title and the old test is deleted (tasks group 2). Old → new: «demo label shows the verbatim text» → «notice shows the verbatim text»; «simulated cards carry the demo label» → «simulated cards carry no demo label»; «list carries the demo label» → «log values carry no demo label»; «all values carry the demo label» → «audience values carry no demo label»; «demo label sits on the simulated values» → «report values carry no demo label».
- [`e2e/acceptance.spec.ts` reads values by splitting group text on `demo.label`] → change `valueOf` to parse the number without the label, and step 3 to expect the notice.
- [`Purpose` lines of `openspec/specs/app-shell/spec.md` and `audience-screen/spec.md` still mention the label] → edit them by hand at archive.
- [SoW §4.1 AC2 and §10.1 glossary still say «Label on simulated values»] → SoW wording is the client's; leave it, the notice meets the same intent.
