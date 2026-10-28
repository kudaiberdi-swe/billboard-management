# Self-hosted Convex stack (Docker compose)

Template from the echo-sdlc plugin. Use it when the project's Convex mode is **self-hosted**. Copy the four files to `deploy/compose/` in the project. One compose file runs the backend in every place; only `.env` differs.

| Where | Data | Used for |
| --- | --- | --- |
| Shared laptop stack | synthetic only | full e2e, backup restore drill rehearsal |
| Test VM | synthetic only | client acceptance, restore drill |
| Production VM | real data, in the region the data residency rule allows | production |

Daily development needs no running backend: tests use convex-test (in memory). Do not run `npx convex dev` from a feature worktree: it pushes that branch to the shared dev deployment. This stack is the Postgres-backed rehearsal of the VM.

## Services

| Service | Image (pinned) | Container port | Laptop host port |
| --- | --- | --- | --- |
| `postgres` | `postgres:17.11-alpine`, volume `pgdata` | 5432 | `127.0.0.1:5442` |
| `backend` | `ghcr.io/convex/convex-backend:<tag>`, volume `convexdata` | 3210 (API, WS), 3211 (HTTP actions) | `127.0.0.1:3410`, `127.0.0.1:3411` |
| `loopback` | `alpine/socat:<tag>` | shares the backend's network namespace | none |
| `dashboard` | `ghcr.io/convex/convex-dashboard:<tag>` | 6791 | `127.0.0.1:6792` |
| `caddy` (profile `https`, off by default) | `caddy:<tag>` | 80, 443 | public VM only |

All host ports bind to `127.0.0.1` (`BIND_ADDRESS`). The laptop ports avoid 3210-3213, which `npx convex dev --local` uses.

Why `loopback`: the backend calls its own public origins from inside the container (Convex Auth fetches `CONVEX_SITE_ORIGIN/.well-known/openid-configuration`). Inside the container it listens on 3210/3211. With host ports 3410/3411, `http://127.0.0.1:3411` is closed in there, and every authenticated call fails with `AuthProviderDiscoveryFailed`. The sidecar forwards 3410/3411 to 3210/3211 inside the backend's namespace. Keep the host ports different from 3210/3211.

## Commands

Set the project name once per shell. Run from `deploy/compose/`.

```sh
P=<project>-convex
DC="docker compose -p $P --env-file .env -f docker-compose.yml"
```

| Task | Command |
| --- | --- |
| First setup | `cp .env.example .env && chmod 600 .env`, then set `POSTGRES_PASSWORD` (`openssl rand -hex 24`) and `INSTANCE_SECRET` (`openssl rand -hex 32`) |
| Start | `$DC up -d --wait` |
| Admin key | `$DC exec backend ./generate_admin_key.sh` (write it to a gitignored file, mode 600; do not print it in logs) |
| Push code | `CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3410 CONVEX_SELF_HOSTED_ADMIN_KEY=<key> npx convex deploy --yes` |
| Any CLI command | same two variables, then `npx convex env list`, `npx convex logs`, `npx convex run ...` |
| Data in Postgres | `$DC exec postgres psql -U convex -d convex_self_hosted -c "select count(*) from documents"` |
| Stop, keep data | `$DC down` |
| Delete all data | `$DC down -v` (ask first) |

Do not set `CONVEX_DEPLOYMENT` in the same shell: the CLI refuses when both it and `CONVEX_SELF_HOSTED_URL` are set.

## Public VM

Same file. In `.env` on the VM:

- `CONVEX_CLOUD_ORIGIN=https://<api domain>`, `CONVEX_SITE_ORIGIN=https://<site domain>`, `DASHBOARD_DEPLOYMENT_URL=https://<api domain>`; set `CONVEX_API_DOMAIN`, `CONVEX_SITE_DOMAIN`, `CONVEX_DASHBOARD_DOMAIN`, `ACME_EMAIL`. Start with `$DC --profile https up -d --wait`.
- Keep `BIND_ADDRESS=127.0.0.1`: only Caddy is public.
- `REDACT_LOGS_TO_CLIENT=1`.
- Managed Postgres: `POSTGRES_URL=postgresql://user:pass@host:port` (no database name), `DO_NOT_REQUIRE_SSL=` (empty). Create the database `convex_self_hosted` first.
- Restrict the dashboard (IP allowlist or basic auth in Caddy) before you expose it.
- Check the VM region and the database region against the data residency rule in `CLAUDE.md` before the first deploy.
- Never set `DEV_IDENTITY_KEY` on the stack. Never seed production.

## Backups and restore drill

```sh
CONVEX_SELF_HOSTED_URL=... CONVEX_SELF_HOSTED_ADMIN_KEY=... npx convex export --path backups/convex-$(date +%F).zip
$DC exec -T postgres pg_dump -U convex -Fc convex_self_hosted > backups/pg-$(date +%F).dump
```

Restore drill: `$DC down -v`, `$DC up -d --wait`, then `pg_restore` into the fresh database or `npx convex import --replace-all <zip>`, then compare counts. Schedule, retention and separate storage are deploy work; record them in `docs/RUNBOOK.md`.

## Upgrading the Convex backend

1. Back up (above).
2. Set `CONVEX_BACKEND_TAG` and `CONVEX_DASHBOARD_TAG` to the same new release tag (`ghcr.io/convex/convex-backend`). Keep the `convex` npm package compatible.
3. `$DC up -d --wait`, push the code, run the smoke test.

## Differences from Convex Cloud

- No insights, advisor, cost, usage or log streams. Logs: `docker logs` and `npx convex logs`. Cloud-only skills do not apply.
- No managed backups, no preview deployments, no custom-domain management: use export + `pg_dump`, and Caddy for TLS.
- One deployment per backend: no dev/prod pair, no deploy keys. The CLI uses `CONVEX_SELF_HOSTED_URL` + an admin key derived from `INSTANCE_SECRET`.
- The backend must reach its own `CONVEX_SITE_ORIGIN` (Convex Auth issuer discovery): hence `loopback` on the laptop, and working DNS + hairpin through Caddy on the VM.
- Flags in the backend start script (`DO_NOT_REQUIRE_SSL`, `REDACT_LOGS_TO_CLIENT`, `DISABLE_BEACON`) are on for ANY non-empty value, including `false`.
- The 1 s query/mutation user-time limit (`DATABASE_UDF_USER_TIMEOUT_SECONDS`) matches Cloud. The first big mutation on a cold backend can hit it.
- The Postgres database name is derived from `INSTANCE_NAME` (`-` becomes `_`).
- Search indexes bootstrap after a restart. The backend logs transient "Search indexes bootstrapping" errors for a few seconds.
- The deployment name is chosen by the operator, so a self-hosted production can be named `local:`. The dev-identity fuse therefore depends on the `DEV_IDENTITY_KEY` value, not on the name (see `identity.ts`).
