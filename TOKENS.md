# Keys and where to get them

Names only. Values live in `.env.local`, in the Convex deployment's environment and in the team secret store. This file is in git: anything that lands here counts as leaked and gets rotated, not deleted from a commit.

A key name is written in backticks: that is how `check-tokens.mjs` finds it. Delete the sections the project does not use.

## Front

Everything prefixed `VITE_` ships to the browser inside the bundle. Secrets do not belong here.

| Key | What for | Where to get it | Where it goes |
| --- | --- | --- | --- |
| `VITE_CONVEX_URL` | backend address for the front | printed by `npx convex dev` on start; the stack URL when self-hosted | `.env.local`, front-end hosting variables |

## Backend

Set with `npx convex env set NAME value`. On production, name the target explicitly (see `docs/RUNBOOK.md`).

| Key | What for | Where to get it | Required |
| --- | --- | --- | --- |
| `DEMO_PASSWORD` | shared demo password checked by `demo.signIn` (ADR-0003); unset = nobody can sign in | team: generate a long random value, share with the client | yes |

## Self-hosted stack

Only when Convex is self-hosted. Values live in the stack's env file on the host, mode 600, never in git.

| Key | What for | Where to get it |
| --- | --- | --- |
| `INSTANCE_SECRET` | signs admin keys; changing it invalidates all of them | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | bundled Postgres password | `openssl rand -hex 24` |
| `POSTGRES_URL` | managed Postgres connection string, without the database name | the database provider |
| `CONVEX_SELF_HOSTED_URL` | CLI target | the backend's public URL |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | CLI admin access | `generate_admin_key.sh` inside the backend container |

## Model

Only when the project calls Azure models (via the `azure-echo` skill).

| Key | What for | Where to get it |
| --- | --- | --- |
| `AZURE_OPENAI_API_KEY` | model output | Azure portal, the resource's Keys page |
| `AZURE_OPENAI_RESOURCE_NAME` | the base URL is derived from it | the Azure resource name |
| `AZURE_OPENAI_API_VERSION` | pins the API surface | Azure OpenAI documentation |

## Stand only

| Key | What for | Fuse |
| --- | --- | --- |
| `DEV_IDENTITY_KEY` | the agent's identity: open any page as any role | has no effect outside a dev deployment, and the caller must present its value; its absence in production is checked by a gate |

## Demo accounts

Passwords of the demo accounts of the test stack and the stand. Synthetic data only. Never production accounts.

| Key | What for | Where the value may appear |
| --- | --- | --- |
| `E2E_DEMO_PASSWORD` | the shared demo password (same value as `DEMO_PASSWORD`) typed by the e2e smoke test into the password screen | `.env.local` only |
| `DEMO_<ROLE>_PASSWORD` | password of the demo account of one role; add one row per role, for example DEMO_ADMIN_PASSWORD. Prefer `[A-Za-z0-9]` only; in `.env` write a value with `#`, quotes or edge spaces in single quotes | `docs/ACCESS.md` (Test section; the stand uses the same seed accounts) and the Access section of the Linear issue description; never in a Linear comment; nowhere else |

## Not issued yet

Rows for keys nobody has handed over. In this state the product must say honestly that the capability is absent rather than show a button to nowhere.

| Key | Why it is needed | Who to ask | What the product does without it |
| --- | --- | --- | --- |
| `<KEY_NAME>` | <why> | <name, role> | <honest behaviour: section hidden, 503 response, "not connected yet"> |
