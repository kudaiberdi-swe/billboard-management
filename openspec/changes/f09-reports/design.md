# Design: f09-reports

## Context

See proposal.md (Why). Locked pieces: `plannedShows(c, screens, from, to)` (period clipped to campaign dates, `byDay`, `byScreen`), `audienceDay(s, date)` (null without camera), `campaignStatus`, `requireDate`, `datesInRange`, `diffDays`, `MAX_PERIOD_DAYS` (366), `showLog` index `by_campaign [campaignId, date]`, `src/print.css` with `.no-print`, `<DemoLabel />`. From f02-dashboard (design.md, `convex/lib/contacts.ts`): `estimateContacts(c, screens, from, to) => { total, byDay, byScreen }`, period clipped like `plannedShows`. From f05-campaign-list: `campaigns.list` and the exported `campaignStatus` return validator in `convex/campaigns.ts`.

## Goals / Non-Goals

**Goals:** one read query that builds the whole report from lib functions; one page; print by stylesheet.

**Non-Goals:** PDF generation, multi-campaign reports, audience profile, a separate print route (ADR-0010 option 2 rejected).

## Convex functions

Takes `sessionId: v.string()` (added by `useGuardedQuery`) and calls `requireActor(ctx, args.sessionId)` first. Role: `admin` (permissions `campaigns.read`, `showLog.read`, `screens.read`).

| Function | Kind | Args (besides sessionId) | Returns | Roles | Notes |
|----------|------|------|---------|-------|-------|
| `reports.campaign` | query | `{ campaignId: v.string(), from: v.optional(v.string()), to: v.optional(v.string()), city: v.optional(city), screenId: v.optional(v.string()) }` | see below | admin | Errors: UNAUTHENTICATED, NOT_FOUND `{entity:"campaign"}`, INVALID_INPUT `{field:"from"\|"to"\|"screenId"}` |

Reused from other changes (not defined here): the campaign picker calls the f05-campaign-list list query `campaigns.list` (args `{}`, returns per f05 design.md).

Return validator of `reports.campaign` (`v.object`; `Ref = { _id: Id<"screens">, code: string, name: string, city: City }`):

```ts
{
  campaign: { _id: Id<"campaigns">, name: string, advertiser: string, startDate: string, endDate: string, status: "planned" | "active" | "finished" },
  period: { from: string, to: string } | null,   // effective period, null when the filter does not overlap the campaign
  options: { cities: City[], screens: Ref[] },     // all campaign screens, for the «Город» / «Билборд» pickers
  cities: City[], screens: Ref[],                   // the selected screens
  placement: {
    plannedShows: number, logShows: number, completion: number | null,
    byDay: { date: string, planned: number, log: number }[],
    byScreen: (Ref & { planned: number, log: number, completion: number | null })[],
  },
  screenAnalytics: { traffic: number, looks: number, contacts: number, screensWithoutCamera: number },
}
```

### Composition (lib calls only)

1. `campaignId` -> `ctx.db.normalizeId("campaigns", ...)` -> doc, else NOT_FOUND.
2. `from = args.from ? requireDate(args.from, "from") : c.startDate`; same for `to`; `from > to` or `diffDays(from, to) + 1 > MAX_PERIOD_DAYS` -> `fail("INVALID_INPUT", { field: "to" })`.
3. Campaign screens = `ctx.db.get` per `screenIds`, sorted by `code`. `screenId` given: `normalizeId("screens")` null or not in `screenIds` -> INVALID_INPUT `{field:"screenId"}`. Selected = campaign screens filtered by `city` and `screenId`.
4. Effective period `[max(from, startDate), min(to, endDate)]`; empty -> `period: null`, all numbers 0, `completion: null`, arrays of the selected screens with zeros.
5. `plannedShows(c, selected, from, to)` -> planned total, byDay, byScreen.
6. Log: `showLog.by_campaign` with `campaignId` eq and `date` in the effective period; keep rows of selected screens; sum per day and per screen.
7. `completion = planned === 0 ? null : Math.round(log / planned * 1000) / 10`.
8. Traffic and looks: sum over selected screens and effective days of `audienceDay(s, d)?.people` / `?.looks` (`?? 0`), the same per-day composition f02 uses for looks; `screensWithoutCamera` = selected screens with `hasCamera === false`.
9. `contacts = estimateContacts(c, selected, from, to).total` (f02 helper; never re-derived here).

## Decisions

- **Planned shows of the selected period, including its future days.** The SoW formula is log / plan × 100; for an active campaign the report therefore shows progress to date. Alternative (plan up to today only) rejected: it would redefine «запланированные показы».
- **Screen traffic = people in view over whole days of the period**, not only campaign hours: it is screen analytics (block «Аналитика экранов»), kept apart from the ad (AC4, AC5). Contacts are the only campaign-bound audience number and come from the D-4 helper.
- **`campaignId` and `screenId` as `v.string()` + `normalizeId`:** they come from the URL; stale ids after reset give contract codes, not validator errors.
- **Campaign picker reuses `campaigns.list` (f05)** instead of a second list query.
- **Print (ADR-0010):** filters, the button and the campaign picker are wrapped in `className="no-print"`; the menu already is. `src/print.css` adds `@page { size: A4 portrait; margin: 12mm; }`, `.report-block { break-inside: avoid; }`, `.report-chart { width: 180mm !important; }`. Charts are Mantine charts (SVG). The disclaimer is the first element of the report and is not `no-print`.
- **Number format:** `Intl.NumberFormat("ru-RU")`, percent with 1 decimal («90,0 %»), dates DD.MM.YYYY (dayjs `ru`).

## Data

None. Reads `campaigns`, `screens`, `showLog`; writes nothing.

## Screens

| Screen | Route | Role | Functions |
|--------|-------|------|-----------|
| «Отчёты» | `/reports?campaign&from&to&city&screen` | admin | `campaigns.list` (picker), `reports.campaign` |

Strings namespace `reports` (SoW verbatim in quotes where the SoW has the text, else team copy):
- `disclaimer` «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват» (SoW verbatim)
- `print` «Печать / сохранить в PDF» (SoW verbatim)
- `placement` «Результаты размещения» (SoW verbatim), `screenAnalytics` «Аналитика экранов» (SoW verbatim)
- `planned` «Запланированные показы», `log` «Показы по журналу», `completion` «Процент выполнения плана», `traffic` «Трафик у экранов за период», `looks` «Взгляды на экран», `contacts` «Оценочные контакты с кампанией» (glossary terms §10.1; team wording around them)
- `campaign` «Кампания», `period` «Период», `city` «Город», `screen` «Билборд», `allCities` «Все города», `allScreens` «Все билборды», `selectCampaign` «Выберите кампанию», `advertiser` «Рекламодатель», `cities` «Города», `screens` «Экраны», `byDay` «Показы по дням», `byScreen` «Распределение по экранам», `noCamera` «Экранов без камеры: {count} (нет камеры)», `noPlan` «—» (team)

## Risks / Trade-offs

- [f02 helper not built yet] `estimateContacts` lands with f02-dashboard. → `Depends on` puts f09 after f02; the signature is fixed in f02 design.md.
- [Query cost] Up to 100 screens × 366 days of `audienceDay` (24 hours each) and `plannedShows`; ~1 M cheap steps for the largest campaign. → Acceptable at demo size; the period filter narrows it.
- [Print differs between browsers] → Acceptance uses one laptop browser (ADR-0010, Chrome recommended); e2e checks print media with Playwright `emulateMedia`.

## Open Questions

None blocking. TODO(client): confirm whether the printed report needs the owner's logo, legal name or a signature line (the SoW names only «BillBoard» as the legal name for documents; the demo prints «BillBoard» from `app.name` in the report header).
