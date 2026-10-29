# Project state

Read this file first in a change round (`/echo-sdlc:change`). `project-state.mjs write` refreshes the blocks between `<!-- gen:<name> -->` and `<!-- /gen:<name> -->` from the project files. Write by hand only outside them. No secrets here: accounts are in `docs/ACCESS.md`, key names in `TOKENS.md`.

## Product

BillBoard is an interactive web demo of a platform for a network of about 100 digital billboards in Kazakhstan (Astana, Karaganda, Atyrau, East Kazakhstan region). It is for the network owner and staff (R-1, «Администратор сети / владелец билбордов»). The advertiser (R-2) has no account and gets only the printable campaign report.
Phase 1 (SoW §2.1, deadline 2026-10-31) shows screens, campaigns, the 5-second slot schedule, simulated audience analytics and the report. Ad playback and audience values are simulated; there is one shared password and no user accounts. Phase 2 content: TODO(client) Q-01.

## Stack and build source

Apps, stack and hosting: `decisions/ARCHITECTURE.md`.

<!-- gen:facts -->
| Item | Value |
| --- | --- |
| Convex mode | cloud (Convex Cloud, EU region) |
| Azure | none (frontend on Vercel, backend on Convex Cloud) |
| Data residency | none |
| UI language | Russian |
| Linear issue | none |
| Build source | docs |
| Security level | demo |
<!-- /gen:facts -->

## Stands

<!-- gen:stands -->
| Stack | Deployed | Commit | URLs | Accepted |
| --- | --- | --- | --- | --- |
| test | 2026-10-29 | 8b7590b | front https://billboard-management-five.vercel.app; backend https://doting-mongoose-973.convex.cloud (Convex Cloud prod, EU) | pending |
| prod | - | - | - | - |

Final e2e: `docs/e2e/REPORT.md`, approved 2026-10-29 (auto).

Security audit: `docs/security/AUDIT.md`, approved 2026-10-29 (auto).

Hand-over: `docs/ACCESS.md`, `docs/RUNBOOK.md`, `docs/handover/`. Accounts and passwords only in `docs/ACCESS.md`.
<!-- /gen:stands -->

## Roles

<!-- gen:roles -->
| Role | Label | Home |
| --- | --- | --- |
| `admin` | Администратор сети / владелец билбордов | / |

Locales: ru. Sign-in: password. Front: vite. Source: `openspec/changes/archive/2026-10-28-base-contract/design.md`.
<!-- /gen:roles -->

## Capabilities

One spec per capability in `openspec/specs/<capability>/spec.md`. A change round changes a capability only through an OpenSpec delta.

<!-- gen:capabilities -->
| Capability | Spec | Requirements | Changed by (last 4) |
| --- | --- | --- | --- |
| `app-shell` | `openspec/specs/app-shell/spec.md` | 6 | base-contract, c00-predeploy-hardening, c01-global-demo-notice |
| `audience-analytics` | `openspec/specs/audience-analytics/spec.md` | 3 | base-contract |
| `audience-screen` | `openspec/specs/audience-screen/spec.md` | 8 | f08-audience-analytics, c00-predeploy-hardening, c01-global-demo-notice |
| `billboard-card` | `openspec/specs/billboard-card/spec.md` | 5 | f03-04-billboards, c01-global-demo-notice |
| `billboard-list` | `openspec/specs/billboard-list/spec.md` | 6 | f03-04-billboards, c01-global-demo-notice |
| `campaign-card` | `openspec/specs/campaign-card/spec.md` | 5 | f05-campaign-list, c00-predeploy-hardening, c01-global-demo-notice |
| `campaign-contacts` | `openspec/specs/campaign-contacts/spec.md` | 3 | f02-dashboard |
| `campaign-create` | `openspec/specs/campaign-create/spec.md` | 12 | f06-campaign-create, c00-predeploy-hardening |
| `campaign-list` | `openspec/specs/campaign-list/spec.md` | 7 | f05-campaign-list, c00-predeploy-hardening, c01-global-demo-notice |
| `dashboard` | `openspec/specs/dashboard/spec.md` | 7 | f02-dashboard, c00-predeploy-hardening, c01-global-demo-notice |
| `date-inputs` | `openspec/specs/date-inputs/spec.md` | 2 | c00-predeploy-hardening |
| `demo-access` | `openspec/specs/demo-access/spec.md` | 4 | base-contract |
| `demo-data` | `openspec/specs/demo-data/spec.md` | 4 | base-contract |
| `reports` | `openspec/specs/reports/spec.md` | 9 | f09-reports, c00-predeploy-hardening, c01-global-demo-notice |
| `schedule` | `openspec/specs/schedule/spec.md` | 8 | f07-schedule, c00-predeploy-hardening |
| `scheduled-cleanup` | `openspec/specs/scheduled-cleanup/spec.md` | 4 | c00-predeploy-hardening |
| `show-log` | `openspec/specs/show-log/spec.md` | 2 | base-contract |
| `simulate-shows` | `openspec/specs/simulate-shows/spec.md` | 7 | f10-simulate-shows, c00-predeploy-hardening |
| `slot-model` | `openspec/specs/slot-model/spec.md` | 7 | base-contract |
| `statuses` | `openspec/specs/statuses/spec.md` | 3 | base-contract |

Plan: `openspec/changes/PLAN.md`, changes: 9, waves: 2, open: none.
<!-- /gen:capabilities -->

## Contract and blocks

<!-- gen:contract -->
- LOCKED: base-contract @ e6447e4 on 2026-10-28

| Block | Version | Files |
| --- | --- | --- |
| strings | 1.0.0 | 6 |

Lock: `.echo/blocks.lock.json`. Change block files only through the yaml contract (`scaffold.mjs`).
<!-- /gen:contract -->

## Key decisions

<!-- gen:decisions -->
| File | Decision | Status |
| --- | --- | --- |
| `decisions/ARCHITECTURE.md` | Architecture | approved 2026-10-28 (auto) |
| `decisions/0001-app-split-and-frontend-stack.md` | 0001. App split and frontend stack | Accepted |
| `decisions/0002-repo-layout-and-shared-code.md` | 0002. Repo layout and shared code | Accepted |
| `decisions/0003-demo-access-shared-password.md` | 0003. Demo access with one shared password | Accepted |
| `decisions/0004-data-model-and-slot-occupancy.md` | 0004. Data model and slot occupancy | Accepted |
| `decisions/0005-simulated-audience-analytics.md` | 0005. Simulated audience analytics | Accepted |
| `decisions/0006-seed-and-demo-reset.md` | 0006. Seed data and «Сбросить демо» | Accepted |
| `decisions/0007-simulated-show-log.md` | 0007. «Смоделировать показы» show log | Accepted |
| `decisions/0008-creatives-and-file-storage.md` | 0008. Creatives and file storage | Accepted |
| `decisions/0009-map-leaflet-osm.md` | 0009. Map of screens with Leaflet and OpenStreetMap | Accepted |
| `decisions/0010-report-print.md` | 0010. Report print with a print stylesheet | Accepted |
| `decisions/0011-environments-hosting-backups.md` | 0011. Environments, hosting, backups and test stack | Superseded by 0012 |
| `decisions/0012-hosting-convex-cloud-vercel-ci.md` | 0012. Hosting on Convex Cloud (EU) and Vercel, deploy by GitHub Actions | Accepted |
<!-- /gen:decisions -->

## Open TODO(client)

<!-- gen:todo -->
17 open (the first 25):

- `docs/SoW.md:25` 2 | Next stage: real integrations and items in §9 | TODO(client): content and deadline of phase 2 (Q-01) |
- `docs/SoW.md:255` Backups (frequency, retention, storage, restore drill) | Demo: the seed and «Сбросить демо» restore the state. Convex export before each dep
- `docs/SoW.md:256` Performance (users, response time, volume) | Volume: 100 screens, 12 slots per minute cycle. Users and response time: not given. | ТЗ §7; TO
- `docs/SoW.md:340` Q-01 | TODO(client): content and deadline of phase 2. | 2.1 | Phase 2 planning | Client |
- `docs/SoW.md:341` Q-02 | TODO(client): backup needs for phase 2. | 5 | Phase 2 | Client |
- `docs/SoW.md:342` Q-03 | TODO(client): expected users and response time for phase 2. | 5 | Phase 2 | Client |
- `docs/SoW.md:343` Q-04 | TODO(client): the commercial slot model. The original request says «Суточная сетка каждой панели делится на 720 слотов». Confirm cycl
- `docs/SoW.md:344` Q-05 | TODO(client): prices in tenge for slots or campaigns. | 9 | Phase 2 | Client |
- `docs/SoW.md:345` Q-06 | TODO(client): confirm the formulas D-3 (occupancy) and D-4 (contacts). | 4.2 | Nothing in phase 1 (demo uses D-3, D-4) | Client |
- `docs/PERSONAL-DATA.md:15` 1 | Which personal data does the product store (IIN, phone, email, address, birth date, documents, health, biometrics)? Which fields hold it
- `docs/PERSONAL-DATA.md:16` 2 | Where is the production database with personal data (country, provider, region)? Art. 12(2) asks for storage in a database on the territ
- `docs/PERSONAL-DATA.md:22` 8 | Who is the contact for a personal-data breach, and what is the notification procedure (Art. 25; breach register, Art. 23-2)? | Demo: non
- `docs/PERSONAL-DATA.md:23` 9 | Who reviewed the 2025-2026 amendments (Art. 10-1, 19-1, 25-1) for this product, and what did they conclude? | TODO(client): review by th
- `decisions/0004-data-model-and-slot-occupancy.md:58` TODO(client): Q-04 commercial slot model (phase 2).
- `decisions/0004-data-model-and-slot-occupancy.md:59` TODO(client): Q-06 confirm D-3 and D-4 formulas.
- `decisions/0011-environments-hosting-backups.md:56` TODO(client): Q-02 backup needs for phase 2.
- `decisions/0012-hosting-convex-cloud-vercel-ci.md:72` TODO(client): Q-02 backup needs for phase 2 (carried from ADR-0011).
<!-- /gen:todo -->

## Change history

One row per change round in `docs/changes/LOG.md`.

<!-- gen:changes -->
_No change round closed yet._
<!-- /gen:changes -->

## Notes

Hand-written: known issues, client preferences, areas to change with care.

- KI-07 (open, accepted trade-off): the spec fixes one shared sign-in bucket (300/min), so an anonymous caller can lock every viewer out of sign-in. The remedy is IP-keyed sign-in through an HTTP action, which needs a spec and design change. Unchanged by ADR-0012.
- KI-03 (residual on Convex Cloud): upload URLs post straight to Convex with a 2-minute timeout and no size cap, so up to about 2 minutes of bytes per URL stay stored until the daily orphan sweep. Session, `upload` rate limit, size and type check in `campaigns.create` stay in force.
- Restore drill not run yet (`docs/deploy/ACCEPTANCE.md`): restore the latest Convex Cloud backup into the dev deployment, check row counts and one sign-in, record the time.
- The CSP in `vercel.json` allows `*.convex.cloud` (img, media, connect). Pin it to the production deployment host before production.
- Security level is `demo`. Re-audit (`/echo-sdlc:audit`) before real production data, after `docs/PERSONAL-DATA.md` is answered.
- Guide screenshots come from the Convex dev deployment, never from the client stack. The capture script resets the dev data before and after the run.
