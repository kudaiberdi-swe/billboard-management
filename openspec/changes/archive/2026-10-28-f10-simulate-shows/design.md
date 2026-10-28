# Design: f10-simulate-shows

## Context

See proposal.md (Why). Locked pieces reused as is: `simulateShowLog(c, screens, nowMs)` (`convex/lib/showLog.ts`, spec `show-log`) and `replaceShowLog(ctx, c, screens, nowMs): Promise<number>` (`convex/seed.ts`; deletes the campaign's `showLog` rows by `by_campaign`, inserts the fresh simulation, returns rows written). Status from `campaignStatus` (`convex/lib/status.ts`), today from `kzNow(Date.now()).date`. `demo.reset` deletes every `showLog` row in one transaction (comment in `convex/demo.ts`: "F-10 must cap the simulated period or batch deletes").

## Goals / Non-Goals

**Goals:** one mutation, one button, a stated period cap; no duplicated simulation code.

**Non-Goals:** changing `simulateShowLog`, `replaceShowLog`, the seed or `demo.reset`; batching; rate limits.

## Convex functions

Takes `sessionId: v.string()` (added by `useGuardedMutation`) and calls `requireActor(ctx, args.sessionId)` first. Role: `admin` (permission `showLog.simulate`).

| Function | Kind | Args (besides sessionId) | Returns | Roles | Notes |
|----------|------|------|---------|-------|-------|
| `showLog.simulate` | mutation | `{ campaignId: v.id("campaigns") }` | `v.object({ rows: v.number(), from: v.string(), to: v.string() })` | admin | `ctx.db.get` null -> `fail("NOT_FOUND", { entity: "campaign" })`; `campaignStatus(c, today) === "planned"` -> `fail("CAMPAIGN_NOT_STARTED")` before any write. Else `last = min(c.endDate, today)`, `from = max(c.startDate, addDays(last, -(SIMULATE_MAX_DAYS - 1)))`; loads the campaign's screens with `ctx.db.get` per `screenIds`; `rows = await replaceShowLog(ctx, { ...c, startDate: from }, screens, Date.now())`; returns `{ rows, from, to: last }`. Errors: UNAUTHENTICATED, NOT_FOUND, CAMPAIGN_NOT_STARTED |

`v.id("campaigns")` is fine here: the id comes from `campaigns.get` on the open card, not from the URL; a stale id of the right table that no longer exists gives `NOT_FOUND`.

## Decisions

- **Cap by passing a clipped campaign to `replaceShowLog`.** `{ ...c, startDate: from }` keeps `_id`, so the delete-by-campaign and the hash factor (campaign, screen, date) are unchanged; only earlier days drop out. Alternatives: change `simulateShowLog` or `replaceShowLog` (locked base code, rejected); filter rows after simulation (duplicates the insert loop, rejected).
- **Cap value `SIMULATE_MAX_DAYS = 31` (team, technical limit, not client data).** Per run: ≤ 100 screens × 31 days = 3 100 inserts + ≤ 3 100 deletes of the previous run (seeded logs are smaller), far below the Convex per-transaction write limit (16 000 documents; builder confirms for the deployed version). For `demo.reset`, the log of one campaign is then ≤ 3 100 rows; the reset also rewrites ~1 000 seed documents. 31 days covers the full past part of every seed campaign (longest: «Новый тариф», 31 days), so seed reports keep full completion %.
- **Window anchored on the last day, not on the start.** A finished campaign keeps its final 31 days instead of getting none.
- **Today = UTC+5** from `kzNow(Date.now())`, same clock as `simulateShowLog`.
- **No confirmation dialog.** Rerun is idempotent for the same day (spec `show-log`); the button only replaces simulated rows.
- `convex/showLog.ts` carries the marker comment `// echo:no-rate-limit demo simulation; only a valid demo session reaches it.` on the mutation, as `demo.reset` does, so the security check does not flag it.

## Data

None. Writes only `showLog` rows of the given campaign (contract: showLog written only by F-10 or the seed).

## Screens

| Screen | Route | Role | Functions |
|--------|-------|------|-----------|
| Campaign card (f05) with `SimulateShowsButton` | `/campaigns/:id` | admin | `showLog.simulate` (the card's `campaigns.get` re-renders reactively) |

`SimulateShowsButton({ campaignId })`: `useSubmit` over `useGuardedMutation(api.showLog.simulate)`; `loading`/disabled while `busy`; shows `error` (already `errors.<CODE>` text) in an `Alert`; on success shows `simulate.done`. Placed in the card header group; not `no-print` sensitive (card is not printed).

Strings namespace `simulate`: `button` «Смоделировать показы» (SoW verbatim), `done` «Показы смоделированы: {from} – {to}» (team; dates formatted DD.MM.YYYY by dayjs `ru`).

## Risks / Trade-offs

- [Reset size is per campaign, not global] Several 100-screen campaigns simulated for 31 days each can still push the total `showLog` above what one `demo.reset` transaction deletes (~14 000 rows after the seed rewrite, i.e. ~4 such campaigns plus the seed). Typical demo campaigns (a few screens) are far below. → Smallest fix is in base code, not here: batch the reset deletes (scheduled internal mutation) or lower the cap. Reported to the orchestrator.
- [Completion % of campaigns longer than 31 days in the past] Their log covers only the last 31 days, so «Процент выполнения плана» is lower than for a full log. → Visible only for viewer-created campaigns that started over 31 days ago; seed campaigns are inside the cap.

## Open Questions

None for the client. TODO(team): confirm the 31-day cap with the orchestrator (risk above).
