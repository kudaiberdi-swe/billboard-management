# Keys and where to get them

Names only. Values live in `.env.local`, in the Convex deployment's environment and in the team secret store. This file is in git: anything that lands here counts as leaked and gets rotated, not deleted from a commit.

A key name is written in backticks: that is how `check-tokens.mjs` finds it.

## Front

Every key in this section ships to the browser inside the bundle. Secrets do not belong here.

| Key | What for | Where to get it | Where it goes |
| --- | --- | --- | --- |
| `VITE_CONVEX_URL` | backend address for the front | printed by `npx convex dev` on start; the stack URL when self-hosted | `.env.local`, front-end hosting variables |

## Backend

Set with `npx convex env set NAME value`. On production, name the target explicitly (see `docs/RUNBOOK.md`).

| Key | What for | Where to get it | Required |
| --- | --- | --- | --- |
| `DEMO_PASSWORD` | shared demo password checked by `demo.signIn` (ADR-0003); unset or shorter than 24 chars = nobody can sign in | team: at least 24 random chars; after rotating run `npx convex run demo:clearSessions`; share with the client | yes |

## CI/CD (GitHub environment secrets)

Set in GitHub -> Settings -> Environments, in both `production` and `development` (values differ per environment). Read only by `.github/workflows/deploy.yml`. Setup: `docs/DEPLOY.md`.

| Key | What for | Where to get it |
| --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | `npx convex deploy` target: the production deployment (`production`) or `dev/ci` (`development`) | Convex dashboard deployment settings, or `npx convex deployment token create`; permission `deployment:deploy` |
| `VERCEL_TOKEN` | Vercel CLI auth for pull, build, deploy | Vercel account tokens page, scoped to the team |
| `VERCEL_ORG_ID` | Vercel team of the project | `orgId` in `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | Vercel project | `projectId` in `.vercel/project.json` after `vercel link` |

## Self-hosted stack

Only when Convex is self-hosted. Values live in the stack's env file on the host, mode 600, never in git.

| Key | What for | Where to get it |
| --- | --- | --- |
| `INSTANCE_SECRET` | signs admin keys; changing it invalidates all of them | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | bundled Postgres password | `openssl rand -hex 24` |
| `POSTGRES_URL` | managed Postgres connection string, without the database name | the database provider |
| `CONVEX_SELF_HOSTED_URL` | CLI target | the backend's public URL |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | CLI admin access | `generate_admin_key.sh` inside the backend container |

## E2E

Synthetic data only. Never production accounts.

| Key | What for | Where the value may appear |
| --- | --- | --- |
| `E2E_DEMO_PASSWORD` | the shared demo password (same value as `DEMO_PASSWORD`, so also 24+ chars) typed by the e2e smoke test into the password screen | `.env.local` only |
