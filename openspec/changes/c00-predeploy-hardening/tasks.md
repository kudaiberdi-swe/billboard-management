Depends on: none
Complexity: routine
Reason: records shipped hardening and UX polish

# Tasks

The code is done on branch `predeploy`. Each task names the commit that shipped it. What is left: link the tests to the new scenario names.

## 1. Backend (shipped in 5a3217b, merged in 591cf21)

- [x] 1.1 backend: `LOG_ROW_BUDGET` clip and log-full refusal in `showLog.simulate` (KI-04). Verify: `convex/hardening.test.ts` «KI-04 simulate keeps all log rows within LOG_ROW_BUDGET»
- [x] 1.2 backend: `dashboard.summary` reads the log by campaign (KI-04). Verify: «KI-04 dashboard log shows count only the selection, as before»
- [x] 1.3 backend: years 2000–2100 in `isDate`, day-count `datesInRange` (KI-05). Verify: the 2 «KI-05» tests
- [x] 1.4 backend: paginated `campaigns.sweepOrphanUploads` (KI-03). Verify: «KI-03 orphan sweep pages past referenced files…»
- [x] 1.5 backend: `demo.purgeExpiredSessions`, `demo.clearOldRateLimits` and their daily crons (KI-06). Verify: the 2 «KI-06» tests

## 2. Frontend (shipped in 09ac29d, b493906, 23cd508, 0afc1e5; merged in 3f3fa66)

- [x] 2.1 frontend: glossary labels and the strings for the new copy (09ac29d). Verify: `shared/strings/ru.ts` holds every quoted string of this change
- [x] 2.2 frontend: «Главная» 8 cards with one «Онлайн / офлайн» card (b493906). Verify: `src/routes/home/home.test.tsx`
- [x] 2.3 frontend: conflict in the preview panel, «Сохранить» off with the hint (23cd508). Verify: `NewCampaign.test.tsx`, `conflictList.test.ts`
- [x] 2.4 frontend: status badges, the «Журнал не смоделирован» hint, «Показать в расписании», the marked campaign in «Расписание», the calm not-started note (23cd508). Verify: `Schedule.test.tsx`
- [x] 2.5 frontend: client-side «Выйти» (0afc1e5). Verify: `src/shell/shell.test.tsx` «sign-out forgets the session…»

- [ ] 2.6 frontend: the log-full message `simulate.logFull` in `SimulateShowsButton`, chosen from `INVALID_INPUT` + `field` "campaignId" (fix branch, open until it lands). Verify: a component test for «full log shows the log full message»
- [ ] 2.7 frontend: the campaign card screen row shows code and name via `screenTitle` (fix branch, open until it lands). Verify: a component test for «screen row shows code and name»

## 3. Test links (both)

- [ ] 3.1 both: give every scenario of this change a test titled `[c00-predeploy-hardening] <scenario name>`. Rename the `[pre-deploy-hardening]` and UX tests that already cover them, and add the missing ones: «not started note turns the button off», «zero log carries the not simulated hint», «card zero log carries the hint», «show in schedule of a campaign outside today», «schedule without campaign marks nothing», «sign out keeps the server session», «three daily jobs are registered», «full log shows the log full message», «screen row shows code and name», «demo label sits on the simulated values», «offline screens form one linked group», «ending campaign links to its card». Verify: the echo `check-scenarios` check passes
- [ ] 3.2 both: update the tests of the 4 scenarios that kept their names but changed their content: «cards show the network values» (dashboard: 8 cards, one «Онлайн / офлайн» card), «conflict message names screens and hours» (campaign-create: panel title plus one line per screen), «new log values reach the readers» (simulate-shows: «Главная» by campaign) and «screen without a camera» (audience-screen: «Камеры нет» title, text with «нет камеры»). Verify: `npx vitest run` passes

## Workflow follow-up

- Archive this change after the tests are linked, so `openspec/specs/` matches `predeploy`.
