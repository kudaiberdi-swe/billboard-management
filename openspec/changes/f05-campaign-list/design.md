# Design: f05-campaign-list

## Context

See proposal.md (Why). Base contract is locked: `campaigns` has no status field and no indexes (~10-15 rows, scan allowed); `showLog` has index `by_campaign [campaignId, date]`. Status comes from `campaignStatus(c, kzNow(Date.now()).date)` (`convex/lib/status.ts`), planned shows from `plannedShows(c, screens, c.startDate, c.endDate)` (`convex/lib/slots.ts`). `convex/campaigns.ts` does not exist yet; f06-campaign-create appends `campaigns.check`, `campaigns.create`, `campaigns.generateUploadUrl` to the same file (append-only, distinct names).

## Goals / Non-Goals

**Goals:** two read queries and two screens; no writes; reuse lib math only.

**Non-Goals:** filters, pagination, create/edit/delete controls, the simulate button (f10), report links.

## Convex functions

All take `sessionId: v.string()` (added by `useGuardedQuery`) and call `requireActor(ctx, args.sessionId)` first. Role: `admin` (the only role, permission `campaigns.read` + `showLog.read`).

| Function | Kind | Args (besides sessionId) | Returns | Roles | Notes |
|----------|------|------|---------|-------|-------|
| `campaigns.list` | query | `{}` | `Array<{ _id: Id<"campaigns">, name: string, advertiser: string, startDate: string, endDate: string, status: "planned" \| "active" \| "finished", cities: City[], screenCount: number, plannedShows: number, logShows: number }>` | admin | newest first (`_creationTime` desc); `cities` unique, in `CITIES` order; `plannedShows = plannedShows(c, screens, c.startDate, c.endDate).total`; `logShows` = sum of `showLog.by_campaign` rows. Errors: UNAUTHENTICATED |
| `campaigns.get` | query | `{ campaignId: v.string() }` | `{ _id, name, advertiser, startDate, endDate, startHour: number, endHour: number, slotsPerCycle: number, status, creative: { kind: "placeholder", key: string } \| { kind: "video", url: string \| null }, cities: City[], plannedShows: number, logShows: number, screens: Array<{ _id: Id<"screens">, code: string, name: string, city: City, status: "online" \| "offline", plannedShows: number, logShows: number }> }` | admin | `ctx.db.normalizeId("campaigns", campaignId)`; null or missing doc -> `fail("NOT_FOUND", { entity: "campaign" })`. Screens in `code` order; per-screen planned from `plannedShows(...).byScreen`. Video `url` from `ctx.storage.getUrl`. Errors: UNAUTHENTICATED, NOT_FOUND |

Validators: `city`, `screenStatus` from `convex/schema.ts`; a local `campaignStatus` validator `v.union(v.literal("planned"), v.literal("active"), v.literal("finished"))` exported from `convex/campaigns.ts` (f09 and f10 may import it).

## Decisions

- `campaignId: v.string()` + `normalizeId` instead of `v.id("campaigns")`: the id comes from the URL; seed ids change on reset (accepted in the contract), so a stale or edited link must give `NOT_FOUND`, not an argument validator error. Alternative `v.id` rejected: its error has no contract code.
- Plan and log totals are computed on read (contract: planned shows are not stored). Screens are read once per query (100 rows) and passed to `plannedShows`.
- One shared private helper in `convex/campaigns.ts` builds the per-campaign summary (status, cities, planned, log) for both queries; no new lib file.
- Card route: one `<Route path="/campaigns/:id" element={<CampaignCard />} />` in `src/shell/AppShell.tsx` before the `*` route (G-2). React Router ranks the static `/campaigns/new` of f06 above `:id`, so the two do not clash. The menu item stays active by `startsWith`.
- The card page header is a Mantine `Group` with the title; f10 adds its `SimulateShowsButton` to that group (one additive line). f05 ships no placeholder control.

## Data

None. Reads `campaigns`, `screens`, `showLog`; writes nothing.

## Screens

| Screen | Route | Role | Functions |
|--------|-------|------|-----------|
| «Рекламные кампании» list | `/campaigns` | admin | `campaigns.list` |
| Campaign card | `/campaigns/:id` | admin | `campaigns.get` |

Strings namespace `campaigns` (team copy, from SoW terms where they exist): `name` «Название», `advertiser` «Рекламодатель», `period` «Период», `cities` «Города», `screens` «Экраны», `screenCount` «Экранов: {count}», `status` «Статус», `planned` «Запланированные показы» (glossary), `log` «Показы по журналу» (glossary), `empty` «Кампаний пока нет», `hours` «Часы показа», `slots` «Слотов в минутном цикле», `creative` «Креатив», `back` «К списку кампаний», `screenCode` «Код», `screenStatus` «Состояние». Status labels reuse `status.*`; city labels reuse `cities.*`; errors reuse `errors.*`; the demo label is `<DemoLabel />`.

## Risks / Trade-offs

- [Read cost grows with the show log] `campaigns.list` reads all `showLog` rows of all campaigns. Bounded by the f10 period cap (≤ 31 days × 100 screens per campaign) and well under the 32 000 documents-read limit at demo size. → If the log grows, store a per-campaign total (contract change).
- [Planned shows for long campaigns] `plannedShows` loops days × screens × hours; at 366 days × 100 screens it is ~0.9 M steps per campaign. → Acceptable at demo size; note for f06 limits.

## Open Questions

None. List order (newest first) and the team copy above are team choices, not client data.
