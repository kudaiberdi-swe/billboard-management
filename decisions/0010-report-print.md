# 0010. Report print with a print stylesheet

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

D-12: report export by browser print only, with a print stylesheet. F-9 AC7: «Печать / сохранить в PDF» opens the browser print dialog; the print stylesheet hides the menu and filters. F-9 AC4: 2 blocks «Результаты размещения» and «Аналитика экранов». F-9 AC6: the report shows «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват». Automatic PDF generation is out of scope (SoW §9.7). The choice inside D-12 is how the print view is built.

## Options

1. **Same `/reports` route, `@media print` rules in `src/print.css`, button calls `window.print()`**: Pros: no extra page or library; what you see is what prints. Cons: charts must have fixed widths for print.
2. **A separate print-only route** (`/reports/print`): Pros: free layout for paper. Cons: two layouts to keep in step.

## Decision

Option 1. Print rules: hide the app shell (menu, filters, buttons) by a shared `no-print` class; A4 portrait, page margins set in `@page`; avoid page breaks inside each block (`break-inside: avoid`); charts render as SVG with a fixed print width; the demo disclaimer prints at the top of the report. Filters are in the URL (ADR-0001), so the printed report matches the selected filters.

## Consequences

- Print output varies a little between browsers; acceptance uses one laptop browser (SoW §7.1). TODO(team): name the browser used in the acceptance run (Chrome recommended).
- An e2e test checks that print media hides the menu and filters (Playwright `emulateMedia({ media: "print" })`).

## Open questions

None.
