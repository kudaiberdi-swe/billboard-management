# Keys and where to get them

Names only. Values live in `.env.local`, in each Convex deployment's environment, in GitHub Actions secrets and in the team secret store. This file is in git: anything that lands here counts as leaked and gets rotated, not deleted from a commit.

A key name is written in backticks: that is how `check-tokens.mjs` finds it.

## Front

Every key in this section ships to the browser inside the bundle. Secrets do not belong here.

| Key | What for | Where to get it | Where it goes |
| --- | --- | --- | --- |
| `VITE_CONVEX_URL` | backend address for the front | set by `npx convex deploy --cmd '<build>'` at build time in CI from the deploy key's deployment (ADR-0012); locally printed by `npx convex dev`, or the stack URL when self-hosted | CI build env (not stored); `.env.local` for local dev. No Vercel env var needed |

## Backend

Set with `npx convex env set NAME value`. On production, name the target explicitly (see `docs/RUNBOOK.md`).

| Key | What for | Where to get it | Required |
| --- | --- | --- | --- |
| `DEMO_PASSWORD` | shared demo password checked by `demo.signIn` (ADR-0003); unset or shorter than 24 chars = nobody can sign in | team: at least 24 random chars, a different value per deployment (Convex prod and Convex dev); set in the dashboard (deployment settings, Environment Variables) or `npx convex env set`; after rotating run `npx convex run demo:clearSessions`; share the prod value with the client | yes, on every deployment |

## CI/CD (GitHub Actions secrets)

Repo `kudaiberdi-swe/billboard-management`, Settings, Environments: set each key in both `production` and `development` (ADR-0012). Only `CONVEX_DEPLOY_KEY` differs between them. Read only by `.github/workflows/deploy.yml`. Setup: `docs/DEPLOY.md`.

| Key | What for | Where to get it | Used by |
| --- | --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | `npx convex deploy` target: the production deployment (environment `production`, `prod:` key) or `dev/ci` (environment `development`, `dev:` key) | Convex dashboard, deployment Settings, Deploy keys, or `npx convex deployment token create`; permission `deployment:deploy` | both jobs |
| `VERCEL_TOKEN` | Vercel CLI auth in CI | Vercel, Account Settings, Tokens (scope: the team that owns the project) | both jobs |
| `VERCEL_ORG_ID` | Vercel team id for the CLI | `.vercel/project.json` after `vercel link`, or team settings | both jobs |
| `VERCEL_PROJECT_ID` | Vercel project id for the CLI | `.vercel/project.json` after `vercel link`, or project settings | both jobs |

## Self-hosted stack (local dev only)

Local dev only (`deploy/compose`, ADR-0012); no deployed stack uses these. Values live in the stack's env file on the host, mode 600, never in git.

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
