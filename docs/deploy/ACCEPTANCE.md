# Deploy and acceptance record

| Stack | Deployed | Commit | URLs | Restore drill | Accepted |
|---|---|---|---|---|---|
| test | 2026-10-30 | e1ff327 | front https://billboard-management-five.vercel.app; backend https://doting-mongoose-973.convex.cloud (Convex Cloud prod, EU) | not run | pending |
| prod | - | - | - | - | - |

Notes (2026-10-29):
- Deployed by GitHub Actions `Deploy` run 40861355089 (`main`): CI (tsc, 411 vitest, npm audit) then Convex deploy and Vercel production (ADR-0012).
- Header probe (`security-scan headers`, level demo): all present. Routes `/`, `/campaigns`, `/reports` return 200. The bundle targets the prod backend.
- Seed: run by the team from the Convex dashboard (`demo:seed`); sign-in checked by the team in the browser.
- Dev stack: `dev` branch run 40863493350, backend https://clear-hare-945.convex.cloud, Vercel Preview behind Vercel login (302).
- Backups: Convex Cloud daily automatic backups with file storage on the prod deployment (team setting). Restore drill still to run before client acceptance: restore the latest backup into the dev deployment, check row counts and one sign-in, record the time.

Notes (2026-10-30, round c01-kpi-align):
- Deployed by GitHub Actions `Deploy` run 41068352870 (`main`, commit e1ff327, 10 commits fa72887..e1ff327): CI (tsc, vitest, npm audit) and deploy job (Convex deploy, Vercel production) all green. No schema or env change, no reseed, no migration.
- Header probe (`security-scan headers`, level demo): all present (SECSCAN_PASS). Routes `/`, `/campaigns`, `/reports` return 200. The bundle targets the prod backend (doting-mongoose-973), no dev or localhost URL.
- Sign-in not checked in this run (no password available at runtime).
- Restore drill: not run. Daily automatic Convex Cloud backups stay on (team setting); retention days still TODO(echo) in `docs/RUNBOOK.md`.
