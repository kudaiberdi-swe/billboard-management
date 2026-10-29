Status: draft

# Proposal: c00-predeploy-hardening

## Why

Before the client demo the security audit (run 1, `docs/security/AUDIT.md`) left 7 needs-validation leads, KI-03 to KI-09, and a design review asked for UX polish. Both were fixed in code on branch `predeploy` (merge commits 591cf21 and 3f3fa66). This change brings the specs in line with that shipped code, so builders and QA test the behaviour that will be demoed. It records behaviour; it does not ask for new code.

Round: c00 (pre-deploy, no client change document). Items: KI-03, KI-04, KI-05, KI-06, design review «ux-polish».

## What Changes

- `simulate-shows`: the whole show log stays within `LOG_ROW_BUDGET` = 20 000 rows. A run keeps the latest days that fit and returns the shorter `from`. When no day fits, it refuses with `INVALID_INPUT` (`field: "campaignId"`) and writes nothing (KI-04). The card shows the dedicated message «Журнал показов заполнен. Сбросьте демо, чтобы смоделировать показы снова.». This is intended behaviour, added by the fix branch. A not-started refusal is a calm note and turns the button off.
- `campaign-create`: a slot conflict shows once, in the preview panel, as the title «Недостаточно свободных слотов» plus one line per screen («{экран} — {даты}, {часы}»). «Сохранить» is off during a conflict, with the hint «Уменьшите число слотов или измените даты». A save refused by the server lands in the same panel.
- New `date-inputs`: every date argument accepts only years 2000–2100 (`INVALID_INPUT` otherwise), and period iteration is bounded by the day count (KI-05).
- `dashboard`: 8 cards, with «Онлайн / офлайн» as one card, and labels from the glossary («Оценочные контакты с кампанией»). Offline screens are one linked notification group, and each ending campaign links to its card.
- `reports`: the disclaimer stands alone; «Демонстрационные данные» sits on each simulated value.
- `audience-screen`: a screen without a camera shows the title «Камеры нет» and a text naming the screen.
- `simulate-shows` readers: «Главная» reads the log by campaign, like «Отчёты».
- `campaign-list`: a campaign with no simulated log shows 0 with the hint «Журнал не смоделирован». The status shows as a badge.
- `campaign-card`: the link «Показать в расписании» opens «Расписание» with the campaign marked. A zero log shows the same hint as the list.
- `schedule`: `?campaign=<id>` highlights that campaign's slots and opens its first hour.
- `app-shell`: client-side «Выйти» clears the session id and shows the password screen. The server session stays valid until it expires.
- New `scheduled-cleanup`: daily jobs purge expired sessions and old rate-limit rows (KI-06), and a paginated orphan-upload sweep runs (KI-03).

Out of scope:
- KI-07 (global sign-in bucket trade-off) and KI-09 (`REDACT_LOGS_TO_CLIENT=1` in `.env.example`). These are documentation and deploy config, with no behaviour change. KI-08 (closed-form plan, one screen index per query) is a performance change with the same results.
- Visual-only polish: contrast tokens, column widths, sticky headers, chart axes, report masthead and print layout.
- A server-side logout.

## Capabilities

### New Capabilities
- `date-inputs`: the product date window (years 2000–2100) for every date argument, and bounded period iteration.
- `scheduled-cleanup`: daily server jobs that delete expired demo sessions, old rate-limit rows and orphan video uploads.

### Modified Capabilities
- `simulate-shows`: whole-log row budget and its log-full message; calm not-started note; readers by campaign.
- `campaign-create`: conflict shown once in the preview panel; save off during a conflict.
- `dashboard`: 8 cards with one «Онлайн / офлайн» card; glossary labels; grouped, linked notifications.
- `reports`: placement of the demo label.
- `audience-screen`: no-camera empty state.
- `campaign-list`: zero-log hint; status badge.
- `campaign-card`: link to the schedule; zero-log hint; screen code and name in the table.
- `schedule`: campaign marked from its card.
- `app-shell`: client-side sign-out.

## Impact

- Code (already on `predeploy`): `convex/showLog.ts`, `convex/lib/time.ts`, `convex/crons.ts`, `convex/demo.ts`, `convex/campaigns.ts`, `convex/dashboard.ts`, `src/routes/campaigns/NewCampaign.tsx`, `src/routes/campaigns/conflictList.ts`, `src/routes/Campaigns.tsx`, `src/routes/campaigns/CampaignCard.tsx`, `src/routes/Schedule.tsx`, `src/components/SimulateShowsButton.tsx`, `src/routes/home/Cards.tsx`, `src/session.ts`, `src/shell/AppShell.tsx`, `shared/strings/ru.ts`.
- No schema change and no contract change: the error codes, tables and public function signatures stay the same. Internal functions `demo.purgeExpiredSessions` and `demo.clearOldRateLimits` are new. `campaigns.sweepOrphanUploads` gets optional internal paging args.
