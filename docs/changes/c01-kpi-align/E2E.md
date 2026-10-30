Status: approved 2026-10-30 (auto)

# Round e2e: c01-kpi-align

- Date: 2026-10-30 (UTC+5). Repo `main` at `f81f505` (the round is merged and archived).
- Stand: the self-hosted Convex dev stack at http://127.0.0.1:3410 (`deploy/compose/docker-compose.yml`, already running, left running). `npx convex dev --once` pushed the functions, then `npx convex run demo:seed` ran. Synthetic data only. No `--local`, no prod.
- Front: Vite on port 3117 (`E2E_PORT=3117`, Playwright `webServer`). For the triage screenshots I started one Vite by hand (PID 76678) and stopped it by PID.
- Sign-in: the password screen. `E2E_DEMO_PASSWORD` was read at runtime from `npx convex env get DEMO_PASSWORD`. It was never printed or written to disk.
- Roles and sessions:

| Role | Session | Notes |
| --- | --- | --- |
| R-1 admin («Администратор сети / владелец билбордов») | Playwright Test contexts through `asRole('admin')`. No Playwright CLI sessions were opened (no `r1`). | The CLI `fill` would put the password in the command line, so a scratch Playwright script took the triage screenshots. |
| R-2 advertiser | no account (SoW §3). The R-2 output is the printable report. Step 10 checks it. | |
| no session | `e2e/backend-acceptance.mjs`, ConvexHttpClient | negative cases |

## Totals

| Suite | Passed | Failed | Notes |
| --- | --- | --- | --- |
| Backend scenario `e2e/backend-acceptance.mjs` | 60 | 0 | `BACKEND PASS: 60/60 checks passed`. The first run was 59/60 because of a test bug (see "Test fixes"). |
| Playwright, all tags, one run | 38 | 0 | `38 passed (54.8s)`: @c01-kpi-align 1, @acceptance 14, @dashboard 11 (new), @smoke 6, @a11y 6 |
| vitest | 415 | 0 | 27 files |
| tsc (`tsc --noEmit`, `tsc -p convex`) | pass | | 0 errors |
| Acceptance SoW §7.3 | 12/12 | | |

## Acceptance scenario (SoW §7.3) and round scenarios

| Step | Role | Backend | Frontend | Evidence |
| --- | --- | --- | --- | --- |
| c01 «card values line up per row» | R-1 | n/a | PASS | `e2e/kpi-align.spec.ts:11` at 1280x800. The occupancy label wraps and «Экраны в сети» does not. Value bottoms and card heights match within 1px. Every label is shown in full. |
| c01 «cards show the network values» | R-1 | PASS | PASS | `e2e/dashboard.spec.ts` «cards show the network values»: 8 cards, 100 screens, 94 / 6. Backend step 1. |
| c01 «screen looks card sums looks» | R-1 | PASS | n/a | `convex/dashboard.test.ts` `[c01-kpi-align] screen looks card sums looks` (vitest) |
| c01 «no session is refused» | none | PASS | n/a | `[c01-kpi-align] no session is refused` (vitest). Backend AUTHZ `dashboard.summary`: ArgumentValidationError / UNAUTHENTICATED / UNAUTHENTICATED. |
| 1 Sign in, «Главная» shows 100 screens | R-1 | PASS | PASS | screens/acceptance/01-admin-home.png |
| 2 «Билборды» filtered by Astana, a card opens | R-1 | PASS | PASS | 02-admin-billboards-astana.png, 02b-admin-billboard-card.png |
| 3 Occupancy, schedule and demo audience on the card | R-1 | PASS | PASS | 03-admin-card-values.png |
| 4 New campaign on several screens | R-1 | PASS | PASS | 04-admin-campaign-form.png |
| 5 Free slots, planned shows | R-1 | PASS | PASS | 720 per screen per day, 2 160 per day, 21 600 total. 05-admin-availability.png |
| 6 Too many slots: conflict named, save blocked | R-1 | PASS | PASS | SLOT_CONFLICT. 06-admin-slot-conflict.png |
| 7 Saved, still there after refresh | R-1 | PASS | PASS | 07-admin-campaign-saved-after-refresh.png |
| 8 «Расписание» shows the new campaign | R-1 | PASS | PASS | 08-admin-schedule-new-campaign.png |
| 9 Report of a seeded campaign | R-1 | PASS | PASS | 09-admin-report-seeded.png |
| 10 «Печать / сохранить в PDF» (the R-2 deliverable) | R-1 for R-2 | n/a | PASS | 10-admin-report-print-media.png, 10-admin-report-print.pdf |
| 11 «Смоделировать показы», log ≤ plan | R-1 | PASS | PASS | log 7 642 ≤ past plan 8 280 ≤ planned 21 600. 11-admin-simulated.png, 11b-admin-report-new-campaign.png |
| 12 «Сбросить демо» restores the seed | R-1 | PASS | PASS | 10 seed campaigns, 100 screens. 12-admin-reset-confirm.png, 12b-admin-after-reset.png |

Screens of the acceptance run are in `docs/changes/c01-kpi-align/screens/acceptance/`. The stage-6 evidence in `docs/e2e/screens/` was left unchanged.

## Branches and regression of capability `dashboard`

| Scenario / fork | Role | Backend | Frontend | Evidence |
| --- | --- | --- | --- | --- |
| planned and log shows are separate cards | R-1 | PASS | PASS | backend step 1. Cards in dashboard.spec |
| log shows update after simulation | R-1 | PASS | PASS | dashboard.spec: an API viewer simulates, and the open page updates without a reload (then demo.reset). Backend F10-AC4: 744 567 → 752 209. |
| occupancy percent follows D-3 | R-1 | PASS | n/a | vitest `convex/dashboard.test.ts` |
| empty selection shows zero | R-1 | PASS | PASS | dashboard.spec: city Астана + a Karaganda billboard. All count cards show 0, 0 / 0, occupancy 0. |
| occupancy chart per day | R-1 | PASS | PASS | dashboard.spec: 7 rows in the chart table |
| screens per city block | R-1 | PASS | PASS | dashboard.spec: 4 regions in order, sum 100 |
| active campaigns list | R-1 | PASS | PASS | dashboard.spec: «Летняя акция»/Demo Cola, «Открытие магазина»/Demo Market, no «Презентация автомобиля» |
| city filter changes all values | R-1 | PASS | PASS | dashboard.spec: URL `city=astana`, screens 35. The city block keeps 4 rows: Астана 35, the others 0. |
| billboard filter changes all values | R-1 | PASS | PASS | dashboard.spec: screens 1, city block sum 1 |
| period filter changes all values | R-1 | PASS | PASS | dashboard.spec: 1 day gives 1 chart row, and planned shows are > 0 and < the 7-day value |
| invalid period is refused | none | PASS | n/a | vitest (INVALID_INPUT naming the field) |
| unknown billboard is refused | R-1 | PASS | PASS (component) | vitest `dashboard.test.ts:307` NOT_FOUND. `home.test.tsx:240` shows the `errors.NOT_FOUND` text. No browser test: the UI cannot produce a deleted screen id. |
| offline screen notification / one linked group | R-1 | PASS | PASS | dashboard.spec: «Экран недоступен» once, count 6, 6 links `/billboards/<id>`, «Все недоступные экраны» → `/billboards?status=offline` |
| ending campaign notification / links to its card | R-1 | PASS | PASS | dashboard.spec: click → `/campaigns/<id>`, and the h1 is the campaign name |
| campaign ending later has no notification | R-1 | PASS | n/a | vitest |
| notifications need a session | none | PASS | n/a | backend AUTHZ `dashboard.notifications` |
| contacts follow D-4 | R-1 | PASS | n/a | vitest |
| simulated cards carry no demo label + global notice | R-1 | n/a | PASS | acceptance «F-1 AC2», vitest `[c01-global-demo-notice]` |
| F-1 AC3/AC4 no password / wrong password | none | PASS | PASS | WRONG_PASSWORD, «Неверный пароль.». F1-wrong-password.png |
| F-1 AC6 second viewer sees the data | R-1 | PASS | PASS | acceptance |
| F-10 simulate on «Запланирована» | R-1 | PASS | PASS | CAMPAIGN_NOT_STARTED. F10-not-started.png |
| «нет камеры» | R-1 | PASS | PASS | NC-*.png |
| Negative authz: 15 public functions × (no sessionId / unknown / expired) | none | PASS | n/a | ArgumentValidationError / UNAUTHENTICATED / UNAUTHENTICATED for every function. The refused calls changed nothing. The expired session is a synthetic `demoSessions` row (expiresAt 1000), imported for this run. |

## Triage item

| # | Item | Result | Evidence |
| --- | --- | --- | --- |
| 1 | KPI numbers on one level per row at desktop width | PASS | `screens/home-kpi.png` (1280x800): label lines per row 1,1,1,3 and 2,1,3,1; card height 145 px; value-bottom spread 0 px in both rows. `screens/home-kpi-1440.png` (1440x900): lines 1,1,1,2 and 2,1,2,1; height 125 px; spread 0 px. 0 console errors. |

## Test fixes (no app code changed)

- `e2e/backend-acceptance.mjs` step 11 «log ≤ plan of the past part only». The bound counted 3 past days only. The simulate-shows spec (`openspec/specs/simulate-shows/spec.md:21`) also counts today's finished hours, so after about 17:00 UTC+5 the check failed: `FAIL [11] log ≤ plan of the past part only — log=7544 pastPlan=6480`. The bound now adds today's finished hours, 08–20 at 60 shows per hour per screen. Re-run: `log=7642 pastPlan=8280`, 60/60.
- New `e2e/dashboard.spec.ts` (@dashboard, 11 tests): the dashboard scenarios that had no browser test. My first draft expected the city block to keep only the Astana row. The app keeps all 4 regions with 0 for the others, which fits the spec («use only the screens of «Астана»»), so I fixed the assertion.

## convex-reviewer (convex/, no function code changed in this round)

| Severity | Finding | Status |
| --- | --- | --- |
| Critical | none. Every public function except `signIn`/`sessionStatus` reaches `requireActor`: AUTHZ_PASS, and the backend negative cases pass. | |
| Important | `Date.now()` in query handlers (`dashboard.ts:58,114`, `campaigns.ts:63,102`, `reports.ts:119`, `screens.ts:29`, `lib/auth.ts:13`). Cached results go stale past midnight UTC+5 and after a session expires. | known since stage 6 (docs/e2e/REPORT.md:70), not new |
| Suggestion | `.collect()` on the `screens`/`campaigns` tables. Both are bounded (100 screens; campaigns capped at 200 by `campaigns.create`). KI-04/KI-08 are fixed. | not new |
| - | No `.filter()` on DB queries (only array filters). Every public function has `args` and `returns`. No `any`. The scheduler and crons target `internal.*`. | |

## convex-authz (4 shapes)

Foundation: there is no `auth.config.ts` by design (ADR-0003: one shared demo password, one role, shared data). The guard is the session check `requireActor`.

| Shape | Hits | Severity |
| --- | --- | --- |
| (a) identity from an argument | 0 (no `userId`/`ownerId`/... args) | - |
| (b) missing ownership check on `_id` reads and writes | 0: no per-owner data, and every `_id` read sits behind `requireActor` | - |
| (c) PII leak by a client-supplied id | 0: no PII fields are returned | - |
| (d) parent-reference ownership on write | 0: `campaigns.create` `screenIds` point at the shared network, which has no owner | - |

No new findings, as expected.

## Echo checks (`/echo-sdlc:checks all`)

| Check | Exit | Result |
| --- | --- | --- |
| authz | 0 | `AUTHZ_PASS` (17 public functions, 1 marked open: `signIn`) |
| tokens | 0 | `TOKENS_PASS` (12 keys, 2 read by the code) |
| dead-controls | 0 | `DEAD_CONTROLS_PASS` |
| wiring | 0 | `WIRING_PASS` |
| scenarios | 0 | `SCENARIOS_PASS` for `c01-kpi-align`. The change is archived, so the check ran on a scratch copy of the tree with the change under `openspec/changes/`. |
| security | 0 | `SECURITY_PASS`, with 14 production-only warnings (CSP wildcard, S5 string bounds, S16 PERSONAL-DATA answers). They are known and not blockers at the demo level. |
| scan (deps, secrets) | 1 on the working tree / 0 on HEAD | Working tree: FAIL, 24 findings (1 critical `tar`, 23 high, all under the uncommitted `"vercel": "^65.7.0"` in `package.json`/`package-lock.json`). Committed HEAD lockfile: `SECSCAN_PASS` (0/0/0/0). Secrets: 277 files, 0 findings. |
| blocks | 0 | `BLOCKS_PASS` |

The scan failure is not from this round: it comes from an uncommitted local change that adds the Vercel CLI as a production dependency. Do not commit it as a `dependency`. Move it to `devDependencies` or a global install, or the deps scan blocks.

## a11y

@a11y (axe, WCAG 2 A/AA, report only): 6 routes (`/`, `/billboards`, `/campaigns`, `/schedule`, `/analytics`, `/reports`). 0 violations logged, none critical or serious.

## Known issues

- KI-07 (shared sign-in rate-limit bucket): re-checked. `convex/rateLimits.ts:51-55` still uses a per-session bucket and then one unkeyed global bucket. The last change was `b95d2df`, so this round did not touch it. It stays `Status: open` as the accepted trade-off. It is out of scope here.

## Open TODO(client) seen in the running app

None seen on the pages this run visited.

## Housekeeping

- Playwright CLI: no sessions were opened. `browser-cleanup.mjs`: `BROWSER_CLEANUP found=0 killed=0`. `e2e/.auth` was not created.
- The synthetic expired `demoSessions` row stays in the dev DB. The daily cron `purge expired sessions` removes it.
