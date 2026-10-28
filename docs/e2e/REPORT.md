Status: approved 2026-10-29 (auto)

# E2E acceptance report: stage 6, run 1

- Date: 2026-10-29 (UTC+5). Repo `main` at `e92dfdb`.
- Stand: a local self-hosted Convex stack (ADR-0011), compose project `billboard-e2e`, `--pull never`.
  - Random secrets in mode-600 scratch files, now deleted.
  - `npx convex deploy --yes`, then `npx convex run demo:seed`. Synthetic data only.
- Front: Vite on port 3100 through the Playwright `webServer`. Sign-in uses the password screen with `E2E_DEMO_PASSWORD`, kept in a temporary `.env.local` that is now deleted.
- Role: R-1 «Администратор сети / владелец билбордов», the only role.
- Sessions: `admin` (R-1) ran in Playwright Test contexts through `asRole('admin')`. No Playwright CLI sessions were opened (no `r1`). F-1 AC6 used a second context as a second viewer.
- Test files: `e2e/backend-acceptance.mjs` and `e2e/acceptance.spec.ts` (tag `@acceptance`).

## Totals
| Suite | Passed | Failed | Skipped | Notes |
| --- | --- | --- | --- | --- |
| Backend scenario | 60 | 0 | 0 | `BACKEND PASS: 60/60 checks passed` |
| @acceptance | 14 | 0 | 0 | `14 passed (27.8s)`. Run 1 had 11 passed / 3 failed from spec bugs (value helper; campaign name regenerated after a retry restarted the worker). Fixed, demo reset, rerun. |
| @smoke | 6 | 0 | 0 | |
| @a11y | 6 | 0 | 0 | Report only; see O-3 |
| vitest | 329 | 0 | 0 | 26 files |
| tsc | pass | | | 0 errors |
| Acceptance §7.3 | 12/12 | | | |
| Criteria §7.2 | 11/11 | | | |

## Acceptance scenario (SoW §7.3)
| Step | Role | Action | Expected result | Backend | Frontend | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | R-1 | Enter the shared password. Open «Главная». | The dashboard shows a network of 100 screens. | PASS | PASS | screens 100 (94 online / 6 offline); menu shows 6 sections in ТЗ order; 01-admin-home.png |
| 2 | R-1 | Open «Билборды», filter by Astana, open a billboard card. | The list shows only Astana screens. The card opens. | PASS | PASS | 35 Astana rows; card AST-001 opens; 02-*.png |
| 3 | R-1 | Look at occupancy, schedule and demo audience on the card. | Values show with «Демонстрационные данные». | PASS | PASS | occupancy 22.2 %, 7 campaigns, 24 hours, audience with the label; 03-admin-card-values.png |
| 4 | R-1 | Create a new campaign on several screens. | The form accepts the values. | PASS | PASS | KRG-003/004/005, today−3..today+6, 08–20, 1 slot; 04-*.png |
| 5 | R-1 | Assign free slots. | The form shows availability and planned shows. | PASS | PASS | «Свободных слотов достаточно»; 720 per screen per day; 2 160 per day; 21 600 for the period; 05-*.png |
| 6 | R-1 | Try to assign more slots than are free. | A clear message names the conflict. Save is blocked. | PASS | PASS | «Недостаточно свободных слотов. Конфликт: KRG-003 … 08:00–20:00»; SLOT_CONFLICT (360 conflicts); not saved; URL stays /campaigns/new; 06-*.png |
| 7 | R-1 | Save the campaign. Refresh the page. | The campaign is in the list after the refresh. | PASS | PASS | Row present after reload, log 0; second viewer sees it; 07-*.png |
| 8 | R-1 | Open «Расписание» for a selected screen. | The new campaign shows in its slots. | PASS | PASS | In the 08:00 slot, not at 20:00; slots «00–05 сек.»…«55–60 сек.» and «Свободно»; 08-*.png |
| 9 | R-1 | Open the report of a seeded campaign. | Plan, log, completion % and the 2 blocks show. | PASS | PASS | «Летняя акция»: plan 1 562 400, log ≤ plan, % = log/plan×100; 2 separate blocks; 09-*.png |
| 10 | R-1 | Click «Печать / сохранить в PDF». | The browser print dialog opens with a clean report. | n/a | PASS | Stubbed `window.print` called once; with print media the menu, filters, h1 and button are hidden; 10-*.png, 10-*.pdf |
| 11 | R-1 | Run «Смоделировать показы» on the new campaign. Open its report. | Shows by the log appear, not more than planned. | PASS | PASS | 12 rows; log 5 926 (backend) / 6 060 (UI), ≤ past-part plan 6 480, ≤ plan 21 600; 11-*.png, 11b-*.png |
| 12 | R-1 | Click «Сбросить демо» and confirm. | The seed data is back. The new campaign is gone. | PASS | PASS | 10 seed campaigns and 100 screens back; new id → NOT_FOUND; 12-*.png, 12b-*.png |

## Branches
| Branch | Role | Backend | Frontend | Evidence |
| --- | --- | --- | --- | --- |
| F-1 AC4 wrong password | R-1 | PASS | PASS | WRONG_PASSWORD; alert «Неверный пароль.»; no menu; F1-wrong-password.png |
| F-1 AC3 no password: only the password screen | R-1 | PASS | PASS | Unknown session → UNAUTHENTICATED; /billboards shows only the password field |
| F-1 AC1 menu order | R-1 | n/a | PASS | 6 links in ТЗ order |
| F-1 AC2 «Демонстрационные данные» | R-1 | n/a | PASS | home, billboards, campaigns, analytics, card, report; F1-label-*.png |
| F-1 AC5 reset with confirmation and «Отмена» | R-1 | PASS | PASS | «Отмена» keeps data; confirm restores the seed |
| F-1 AC6 another viewer sees the data | R-1 | PASS | PASS | second session/context |
| F-6 slot conflict blocks save | R-1 | PASS | PASS | step 6 |
| F-6 AC9 log 0 until simulate | R-1 | PASS | PASS | 0 → >0 |
| F-9 AC6 disclaimer verbatim | R-1 | n/a | PASS | exact text present |
| F-9 AC5 no «confirmed audience» label | R-1 | n/a | PASS | no match |
| «нет камеры» | R-1 | PASS | PASS | list 20 rows; card; analytics; report «Экранов без камеры: 6 (нет камеры)»; NC-*.png |
| F-10 simulate on a planned campaign | R-1 | PASS | PASS | CAMPAIGN_NOT_STARTED with its alert; F10-not-started.png |
| F-10 AC4 dashboard log updates | R-1 | PASS | n/a | 728 635 → 734 561 |
| F-11 seed | — | PASS | PASS | 35/25/20/20; 6 offline; 20 without camera; 10 campaigns; 7 notifications |
| F-11 AC4 schedule = card | R-1 | PASS | n/a | same campaign in `schedule.day` and `screens.get` |
| Negative auth, 15 functions × 3 cases | — | PASS | n/a | ArgumentValidationError / UNAUTHENTICATED / UNAUTHENTICATED; refused calls changed nothing |

## Known issues
- KI-01: false gap confirmed (F-1 OK). Close.
- KI-02: false gap confirmed (F-11 OK). Close.

## convex-reviewer
| Severity | Finding |
| --- | --- |
| Critical | none |
| Important | `Date.now()` in query handlers (screens.list/get, campaigns.list/get, dashboard.summary/notifications, reports.campaign, requireActor expiry). Cached results go stale past midnight UTC+5 and after a session expires, until data changes. Fix: pass `today` as an arg; a cron that purges expired sessions. |
| Important | Unbounded `showLog` collects: campaigns.list (N+1 per campaign), dashboard.summary over the period, reports.campaign. Can pass the read limits and the 1 s UDF limit at the 200-campaign × 31-day scale. Seed scale is fine; already marked `shortcut:`. Fix: per-campaign/day totals. |
| Suggestion | `sessionId` has no length/UUID check outside `signIn` (S5). Fix: put the UUID check in `requireActor`. |
| Pass | args/returns validators on all 17 public functions; no `.filter()` on DB queries; no `any`; scheduler and cron target `internal.*`; arrays bounded. |

## convex-authz
- No `auth.config.ts` and no users table, by design (ADR-0003 shared password, one role). No `ctx.auth` added. Privileged functions are already internal.
- Scan: (a) 0, (b) 0, (c) 0, (d) 0 defects. Data is shared across viewers by spec.
- Low: any viewer can run `demo.reset` (by design, D-13). Info: the bearer session UUID is in localStorage.

## Echo checks
- authz 0 AUTHZ_PASS
- tokens 0 TOKENS_PASS
- dead-controls 0 DEAD_CONTROLS_PASS
- wiring 0 WIRING_PASS
- scenarios N/A (no change ids)
- security 0 SECURITY_PASS (13 demo warnings: 10×S16 PERSONAL-DATA.md, 3×S5)
- scan 0 SECSCAN_PASS (audit 0/0/0/0, secrets 0/224 files)
- blocks 0 BLOCKS_PASS

## Failures
None in the final runs.

## Observations (non-blocking)
- O-1 (Low): screen labels repeat the code, e.g. «KRG-003 KRG-003 Набережная», because the UI builds `${code} ${name}` and the seed name already contains the code. Seen in the form picker, conflict text, schedule and analytics selects (06-*.png, 08-*.png). Suspect: base seed or f06/f07/f08.
- O-2 (Low): the reports «Период» filter shows as a narrow empty input (11b-*.png). Suspect: f09-reports.
- O-3 (Medium, follow-up): axe color-contrast serious on every route (296 nodes on /billboards); aria-hidden-focus on / and /analytics.

## TODO(client)
- ru.ts:150 form field labels
- ru.ts:219 age/gender estimate note
- ru.ts:221 Russian definitions of the 4 terms

## Not checked
- Map tile failure fallback
- Video upload
- The real print dialog (it was stubbed)
- No parity section (build source is `docs`)
