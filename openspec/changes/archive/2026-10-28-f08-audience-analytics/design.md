# Design: f08-audience-analytics

## Context

See proposal.md - Why. The locked generator `convex/lib/analytics.ts` gives `audienceHour(s, date, hour)` (null without a camera, `vehicles` null without the vehicle metric, 0 outside working hours, day = sum of hours) and `audienceProfile(s)`. This change only aggregates and shows them. Screen picker data comes from `screens.options` (base).

## Goals / Non-Goals

**Goals:**
- One read query for one screen and a period; all numbers from the generator.

**Non-Goals:**
- Multi-screen or per-city aggregates, contacts (D-4 lives in f02 `convex/lib/contacts.ts`), export.

## Convex functions

All public functions take `sessionId: v.string()` (added by `useGuardedQuery`) and call `requireActor(ctx, args.sessionId)` first. Args below are listed without it. Role: `admin` (R-1).

| Function | Kind | Args | Returns | Roles | Notes |
|----------|------|------|---------|-------|-------|
| `analytics.screenPeriod` | query | `{ screenId: v.id("screens"), from: v.string(), to: v.string() }` | `{ screen: { _id: Id<"screens">, code: string, name: string, city: City, hasCamera: boolean, hasVehicleMetric: boolean }, audience: null \| { people: number, gazeEstimated: number, looks: number, vehicles: number \| null, lookShare: number, byHour: Array<{ hour: number, people: number, looks: number }>, profile: { age: { "18-24": number, "25-34": number, "35-44": number, "45-54": number, "55+": number }, gender: { male: number, female: number } } } }` | admin | `requireDate(from,"from")`, `requireDate(to,"to")`; `from > to` -> `INVALID_INPUT {field:"to"}`; `diffDays(from,to)+1 > MAX_PERIOD_DAYS` -> `INVALID_INPUT {field:"period"}`; `ctx.db.get(screenId)` null -> `NOT_FOUND {entity:"screen"}`. `audience` null when `hasCamera` false. |

Composition: for each `d` in `datesInRange(from,to)` and `h` in 0..23, add `audienceHour(s,d,h)` into `byHour[h]` and the totals (`vehicles` stays null when the generator returns null). `lookShare = gazeEstimated === 0 ? 0 : Math.round(looks / gazeEstimated × 1000) / 10`. `profile = audienceProfile(s)`. At most 366 × 24 = 8 784 generator calls per query.

`returns` validator mirrors the type above (`v.union(v.null(), v.object(...))`, `v.union(v.number(), v.null())` for vehicles). The result holds no personal data by construction (no table with people exists).

## Data

None. Reads `screens` by id only.

## Screens

| Screen | Route | Role | Functions |
|--------|-------|------|-----------|
| «Аналитика аудитории» (`src/routes/Analytics.tsx`, parts in `src/routes/analytics/*`) | `/analytics` | R-1 | `screens.options` (billboard picker), `analytics.screenPeriod` |

- Pickers: «билборд» (`screens.options`, default first option) and «период» (Mantine `DatePickerInput type="range"`, default `addDays(today,-6)`..`today`, UTC+5). URL params `screen`, `from`, `to`.
- `audience === null`: show `audience.noCamera` «нет камеры» only.
- Cards: people («трафик»), vehicles (hidden when null), looks («взгляд на экран»), look share. Chart: Mantine `BarChart` or `LineChart` with 2 series (people, looks) over hours 0-23. Profile: age bars and gender split; titles carry «предположительно»; each block shows `audience.estimateNote`. Terms block: 4 glossary terms with meanings. `<DemoLabel />` on cards, chart and profile.
- Errors: `errorText(error)` from the query error.

### Strings (`audience` namespace)

SoW-verbatim terms: `traffic` «трафик», `look` «взгляд на экран», `adShow` «показ рекламы», `campaignContact` «контакт с кампанией», `presumably` «предположительно», `noCamera` «нет камеры», age keys `age18_24` «18–24» … `age55` «55+».
Team copy: `filterBillboard` «Билборд», `filterPeriod` «Период», `people` «Трафик: люди в зоне обзора», `vehicles` «Трафик: транспорт», `looks` «Взгляды на экран», `lookShare` «Доля взглядов среди людей с оценённым направлением взгляда, %», `byHour` «Аудитория и взгляды по часам», `age` «Возраст (предположительно)», `gender` «Пол (предположительно)», `male` «Мужчины», `female` «Женщины», `termsTitle` «Термины».
`estimateNote`: TODO(client) exact text; team draft «Возраст и пол — оценка алгоритма, не точные данные.».
Term meanings (`trafficMeaning`, `lookMeaning`, `adShowMeaning`, `campaignContactMeaning`): TODO(client) Russian text; team draft = translation of SoW §10.1: «Количество объектов, обнаруженных в зоне наблюдения.», «Оценка того, что человек посмотрел в сторону экрана.», «Воспроизведение конкретной рекламы.», «Возможный контакт со зрителем во время показа конкретной рекламы.».

## Decisions

- Per-hour chart sums each hour of day over the period (24 points), not a timeline of every hour (up to 8 784 points): readable, and the points sum to the totals. Alternative (average per day) rejected: fractional values, totals no longer match.
- Unknown `screenId` -> `NOT_FOUND` (existing code; stale URL after reset).
- Default billboard = first `screens.options` entry even without a camera; the «нет камеры» state is part of the spec.

## Risks / Trade-offs

- [Russian note and term meanings not given by the client] -> team draft texts in the strings module, marked `team`, listed as TODO(client).
- [`audienceProfile` is per screen, not per period] -> the profile does not change with the period; accepted (D-10 demo profile).

## Open Questions

- TODO(client): exact text of the note that age and gender are an algorithm estimate (SoW §4.8 AC2). Non-blocking.
- TODO(client): Russian definitions of «трафик», «взгляд на экран», «показ рекламы», «контакт с кампанией» for the terms block (SoW §10.1 is in English). Non-blocking.
