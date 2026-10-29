# 0011. Environments, hosting, backups and test stack

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Superseded by 0012 | 2026-10-28 | architect agent (draft), machine gate (auto) | - | [0012](0012-hosting-convex-cloud-vercel-ci.md) (2026-10-29) |

> Superseded by [ADR-0012](0012-hosting-convex-cloud-vercel-ci.md) (User decision, 2026-10-29): hosting moves to Convex Cloud (EU) + Vercel with GitHub Actions; backups use Convex Cloud backups; `deploy/compose` stays for local dev only. The test stack part below (vitest, convex-test, Playwright) still holds.

## Context

Fixed inputs (project `CLAUDE.md`): "Convex mode | self-hosted (Docker on own VM)", "Azure | hosting on Azure", "Data residency | none", "Security level: demo", "Development and test use synthetic or anonymized data only." User facts (2026-10-28): the demo runs locally for now; the Azure deploy comes later; deadline 2026-10-31. SoW §7.1 says the executor deploys the demo to the test stack on Azure for acceptance (see OQ-1). SoW §5: backups for the demo are the seed and «Сбросить демо», plus a Convex export before each deploy. K-05: self-hosted Convex on an Azure VM adds setup work.

Self-hosted Convex facts (self-hosted README, verified 2026-10-28): `docker compose up` starts backend and dashboard; backend on port 3210, HTTP actions on 3211, dashboard on 6791; state in SQLite by default, Postgres or MySQL optional; files in a Docker volume by default, S3 optional; admin key from `generate_admin_key.sh`; the CLI targets it with `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY`; the backend does not host the web app.

## Options

Local dev backend:

1. **Self-hosted Convex in Docker on the dev machine** (same image as the Azure VM later): Pros: same mode as production, no cloud account. Cons: Docker on the laptop.
2. **Convex Cloud dev deployment**: Pros: zero setup. Cons: different mode from the fixed self-hosted choice.

Azure later:

- a. **One Ubuntu VM with docker compose: Convex backend + dashboard (SQLite on a managed disk) + Caddy** (TLS via Let's Encrypt, serves the static front build, proxies `api.` to 3210 and `actions.` to 3211; dashboard port not public, reached by SSH tunnel). Pros: one machine, one compose file, cheapest. Cons: single point of failure (fine, no SLA, SoW §5).
- b. **VM for Convex + Azure Static Web Apps for the front**: Pros: managed front hosting. Cons: two services, CORS and URL config; not needed.
- c. **VM + Azure Database for PostgreSQL**: Pros: managed DB backups. Cons: cost and setup for a few hundred demo documents.

## Decision

Acceptance environment (OQ-1): the 2026-10-31 acceptance demo runs on a local laptop stack (self-hosted Convex in Docker + the front build); the Azure test stack comes later. Reason: User decision, 2026-10-28 (the user said: run locally for now).

Local dev: option 1. `deploy/docker-compose.yml` from the Convex self-hosted template runs locally; `.env.local` holds `CONVEX_SELF_HOSTED_URL`, `CONVEX_SELF_HOSTED_ADMIN_KEY` and `VITE_CONVEX_URL` (names only in `TOKENS.md`). `npx convex dev` pushes functions; `npx convex run demo:seed` seeds an empty deployment.

Test stack:

- Unit and backend tests: vitest + `convex-test` (in memory, no Docker), for `convex/lib/*` and the guarded functions (`requireActor`, conflict check, reset, simulate).
- e2e: Playwright against the local stack with the seed, covering the SoW §7.3 scenario steps 1–12.
- All test data is the synthetic seed.

Azure later: option a, in a region chosen at the deploy gate (OQ-2). Before each deploy and before each reset on a shared stack worth keeping: `npx convex export --include-file-storage --path backups/<date>.zip` (the `backups/` folder is gitignored). Restore: `npx convex import` of the zip (exact replace flags for self-hosted: UNVERIFIED; check in the first deploy rehearsal). The seed plus «Сбросить демо» is the primary recovery for the demo (SoW §5).

Observability: Convex logs in the self-hosted dashboard; no error tracker and no audit log (SoW §5).

## Consequences

- Deviation from SoW §7.1: the SoW says the executor deploys the demo to the test stack on Azure for acceptance; acceptance on 2026-10-31 runs on the local laptop instead (OQ-1, user decision 2026-10-28). `docs/SoW.md` stays as approved; this ADR and ARCHITECTURE.md §2 record the deviation. K-05 (Azure VM setup) leaves the critical path.
- The local laptop must have Docker running and the seed reset before the meeting; the map (OSM tiles) still needs internet (ADR-0009).
- Local and Azure run the same Convex image and the same compose file; the deploy is "copy compose, set env, push functions, build front".
- The VM must keep the Docker volume on a persistent disk.
- TODO(team): VM size, OS image and domain or Azure DNS label, at the deploy stage.
- Phase 2 backup needs are open (Q-02).

## Open questions

- TODO(team): OQ-2 Azure region and public URL. Owner: team, decided at the human deploy gate (`/echo-sdlc:deploy`).
- TODO(client): Q-02 backup needs for phase 2.
