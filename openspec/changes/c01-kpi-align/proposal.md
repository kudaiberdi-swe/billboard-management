Status: draft

# Proposal: c01-kpi-align

## Why

Round c01, item c01 #1 (`docs/changes/c01-kpi-align/TRIAGE.md`, type change, size S, contract no). Client wording: «Выровнять цифры в KPI-карточках «Главная» по нижнему краю: сейчас цифры скачут по высоте, т.к. часть подписей в 2 строки». Some card labels wrap to 2 lines, so the numbers of the 8 cards sit at different heights. All numbers of a row must sit on one level, at the bottom edge of the card.

## What Changes

- `dashboard`, requirement «Network value cards»: within one row, every card has the same height and its value sits at the bottom edge of the card, so the values of a row line up whatever the label length. Labels wrap and are shown in full, never truncated.
- Unchanged: the 8 labels, their order, the 2 × 4 layout, every value and its computation, the existing scenarios.

Out of scope: backend, data, the contract, label wording, card style (font, colors, padding), other screens (only route `/` uses this card), the mobile layout.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `dashboard`: MODIFIED «Network value cards» (adds the row alignment rule and one scenario).

## Impact

Frontend only: `src/routes/home/Cards.tsx` (card layout), plus one Playwright e2e check in `e2e/`. No Convex function, no strings change.
