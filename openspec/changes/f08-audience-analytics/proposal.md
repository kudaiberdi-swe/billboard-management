Status: draft

# Proposal: f08-audience-analytics

## Why

SoW §4.8 F-8 «Аналитика аудитории». The owner shows advertisers what a screen's simulated audience looks like for a period: people in view, vehicles, screen looks, look share, age groups and gender «предположительно», and a per-hour chart, all labelled as demo values and with no personal data. Today `src/routes/Analytics.tsx` is an empty stub; the values already come from the locked generator (`audience-analytics`, `convex/lib/analytics.ts`).

SoW functions: 4.8

## What Changes

- New Convex module `convex/analytics.ts` with the query `analytics.screenPeriod` (totals, per-hour chart data, age/gender profile for one screen and a period). Computes with `audienceHour` / `audienceProfile` only; no new audience math.
- `src/routes/Analytics.tsx` filled: billboard and period pickers (URL params), value cards, per-hour chart, age and gender block with the algorithm-estimate note, terms block, «нет камеры» state, demo labels.
- New strings namespace `audience` in `shared/strings/ru.ts` (append only), including `audience.noCamera` «нет камеры» (G-5, ADR-0005).

## Capabilities

### New Capabilities
- `audience-screen`: the «Аналитика аудитории» section that shows the simulated audience of one screen for a period.

### Modified Capabilities
None. `audience-analytics` (the generator) is used as it is.

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.8.1 | screen period values |
| 4.8.1 | vehicles only where measured |
| 4.8.1 | look share among gaze |
| 4.8.1 | age groups and gender |
| 4.8.1 | audience and looks per hour |
| 4.8.2 | estimate note on age and gender |
| 4.8.3 | glossary terms are used |
| 4.8.4 | no personal data |
| 4.8.5 | all values carry the demo label |

## Out of scope

- Cameras, computer vision, face identification (SoW §9.2).
- Network-wide or per-city audience totals, campaign contacts (F-2 and F-9 show those).
- Export, print or comparison of screens.
- Any write function: the section is read-only.

## Impact

- Code: `convex/analytics.ts`, `convex/analytics.test.ts`, `src/routes/Analytics.tsx`, `src/routes/analytics/*`, `shared/strings/ru.ts` (new `audience` namespace).
- `convex/analytics.ts` (public module) is a different file from `convex/lib/analytics.ts` (locked generator); it imports from it.
- No schema change, no new tables, no new error codes, no rate limit.
