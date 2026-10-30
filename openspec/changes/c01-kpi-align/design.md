# Design: c01-kpi-align

## Context

See proposal.md - Why. The card is `Card` in `src/routes/home/Cards.tsx:45-59`: a `Paper` holding `<Stack gap="xs" align="flex-start">` (line 49) with the label `Text` and the value `Text`. The 8 cards sit in `<SimpleGrid cols={4}>` (line 37). The grid already stretches each `Paper` to the row height, but the `Stack` has no height and no `justify`, so the value follows right under the label and moves down when the label wraps. Only route `/` renders this card.

The repo already solves the same case in `src/routes/analytics/Blocks.tsx:50`: `<Stack gap="xs" align="flex-start" h="100%" justify="space-between">`.

## Goals / Non-Goals

**Goals:** equal card height per row; value at the bottom edge; values of a row on one level; labels wrap in full.

**Non-Goals:** no fixed card height, no label truncation or `lineClamp`, no font or spacing change, no shared card component (one call site).

## Convex functions

None. This change calls no new function and changes no signature. «Главная» keeps the functions of the archived `dashboard` spec.

## Data

None.

## Screens

| Screen | Role | Change | Functions |
|--------|------|--------|-----------|
| «Главная» (`/`), KPI cards | R-1 | card `Stack` fills the card and pushes the value to the bottom | unchanged |

## Decisions

- Reuse the `Blocks.tsx:50` pattern: add `h="100%" justify="space-between"` to the `Stack` at `Cards.tsx:49`. The grid gives equal heights per row; the `Stack` fills the `Paper` and puts the label at the top, the value at the bottom. Alternatives: a fixed `minHeight` (breaks when a label wraps to 3 lines at a narrower width) or `lineClamp` on labels (truncates, which the client did not ask for). Rejected.

## Risks / Trade-offs

- [jsdom cannot measure layout, so a vitest test cannot prove alignment] → the scenario «card values line up per row» is covered by a Playwright e2e check that compares the bounding boxes of the value elements per row, tagged `@c01-kpi-align`.
- [At a width where no label wraps the change is invisible] → the e2e check runs at a desktop width where «Занятость рекламного инвентаря» wraps; the test asserts the wrap first, so it cannot pass vacuously.

## Migration Plan

None. Frontend-only style change; rollback is reverting the one line.

## Open Questions

None.
