# 0012. Hosting on Convex Cloud (EU) and Vercel, deploy by GitHub Actions

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-29 | User decision, 2026-10-29 (human gate) | [0011](0011-environments-hosting-backups.md) (hosting, backups, environments) | - |

## Context

ADR-0011 fixed self-hosted Convex in Docker, local now and one Azure VM (compose + Caddy) later, with the region and URL open (OQ-2). At the 2026-10-29 human gate the user moved hosting to managed services. The user has Convex Pro and Vercel Pro. The repo is `github.com/kudaiberdi-swe/billboard-management`.

Fixed inputs that stay the same: "Data residency | none" (project `CLAUDE.md`), no personal data in the demo, synthetic data only (ТЗ §10, SoW §5), "Security level: demo". SoW §7.1 says the executor deploys the demo to "the test stack on Azure"; this ADR changes where the test stack runs (see Consequences).

Vendor facts (checked 2026-10-29):

- Convex regions: Europe (Ireland) `aws-eu-west-1`; "An existing deployment's region cannot be changed"; "Usage in regions outside the US is billed at 1.3x the standard rate". Source: docs.convex.dev/production/regions.
- Deploy keys: "You can create and delete deploy keys for any cloud deployment you have access to from either the dashboard or the CLI"; types `prod:`, `preview:`, `dev:`; dashboard: deployment settings, "Generate a deploy key", permission `deployment:deploy`; CLI: `npx convex deployment token create <name> --deployment dev|prod`. Source: docs.convex.dev/cli/deploy-key-types.
- `npx convex deploy` with a `dev:` key deploys to that dev deployment: read from the CLI source (`convex` 1.48.0, `deployToExistingDeployment` takes any key that names an existing deployment). The docs do not say this. Check it on the first `dev` run.
- `npx convex deploy --cmd '<build>'` sets the URL variable for the build command; for a Vite project the CLI picks `VITE_CONVEX_URL` (CLI source 1.48.0, `lib/envvars.js`); `--cmd-url-env-var-name` sets the name explicitly. Source: docs.convex.dev/production/hosting/vercel, docs.convex.dev/cli.
- Backups: "Backup Now" (manual, kept 7 days); "Backup automatically" daily (kept 7 days) or weekly (kept 14 days), "Periodic backups require a Convex Pro plan"; "Backups can be configured to include file storage"; restore "is a destructive operation that wipes your existing data"; backups can be downloaded. Source: docs.convex.dev/database/backup-restore.
- Uploads: "The file size is not limited, but upload POST request has a 2 minute timeout." "The upload URL expires in 1 hour". Source: docs.convex.dev/file-storage/upload-files.
- Limits: 1 s user code per query/mutation, 32 000 documents scanned, 16 MiB read, 16 000 documents written per transaction; the same on Free and Pro. Source: docs.convex.dev/production/state/limits.
- Errors: production deployments redact server errors to "Server Error"; development deployments send the message and a stack trace to the client. Source: docs.convex.dev/functions/error-handling.
- Vercel: `vercel.json` sets response `headers` (source + key/value list) and `rewrites` (SPA fallback to `/index.html`). Source: vercel.com/docs/project-configuration/vercel-json.

## Options

1. **Self-hosted Convex in Docker on an Azure VM, per ADR-0011**: Pros: one compose file for local and remote; full control. Cons: the team runs the VM, TLS, Caddy, OS patches and backups (export + `pg_dump`); no managed backups, no deploy keys, one deployment per backend (`deploy/compose/README.md`); region and URL still open (OQ-2). Cost: VM + disk + team time.
2. **Convex Cloud (EU) + Vercel, deployed by GitHub Actions**: Pros: no servers to run; managed TLS, scheduled backups with file storage, separate prod and dev deployments with deploy keys; both services are already paid (Pro). Cons: the Convex mode differs from the original fixed input; 1.3x usage price in the EU region; the upload size cap at the proxy goes away. Cost: inside the existing Pro plans plus the EU surcharge on usage.
3. **Local laptop only**: Pros: nothing to set up; what ran the 2026-10-31 acceptance per ADR-0011. Cons: no shared URL for client review; the laptop must be on; no backups beyond seed + reset.

## Decision

Option 2. Reason: User decision, 2026-10-29 (human gate).

- **Backend**: Convex Cloud, one project, region Europe (Ireland) `aws-eu-west-1` for both deployments. Production deployment and one development deployment.
- **Frontend**: Vercel, one project, static Vite build, default `*.vercel.app` domain for now.
- **CI/CD**: GitHub Actions in `github.com/kudaiberdi-swe/billboard-management`.
- **Branch mapping**:

  | Git branch | Convex deployment | Deploy key (GitHub secret) | Vercel environment |
  | --- | --- | --- | --- |
  | `main` | production | `CONVEX_DEPLOY_KEY` in GitHub environment `production` (`prod:` key) | Production |
  | `dev` | development `dev/ci` | `CONVEX_DEPLOY_KEY` in GitHub environment `development` (`dev:` key of `dev/ci`) | Preview |

  Each job runs `npx convex deploy --cmd '<front build>' --cmd-url-env-var-name VITE_CONVEX_URL` with its key as `CONVEX_DEPLOY_KEY`, then deploys the build with the Vercel CLI (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). Vercel's own Git auto-deploy stays off so each push deploys once. The exact build/deploy command pair (`vercel build` + `vercel deploy --prebuilt`, or a plain static upload) is chosen when the workflow is written; whether `vercel build` passes the CI process env `VITE_CONVEX_URL` through to the Vite build is UNVERIFIED.
- **First deploy**: `main` only.
- **Pipeline mapping**: the Convex production deployment from `main` serves the pipeline's `test` stack (synthetic seed, client review). The pipeline's real `prod` (real personal data) is not decided here. It needs client acceptance, a completed `docs/PERSONAL-DATA.md` and `Security level: production`; it will likely need a separate Convex project (or a re-designation of this one), and a residency check, since this project is in the EU.
- **Backups**: Convex Cloud backups on the production deployment: "Backup automatically" daily with file storage, plus "Backup Now" before each deploy that changes the schema and before a reset worth keeping. The seed plus «Сбросить демо» stays the primary recovery for the demo (SoW §5). `npx convex export --include-file-storage` stays available for an offline copy.
- **Local dev**: unchanged. `deploy/compose` (self-hosted Convex in Docker) stays for local development and e2e only; it is no longer a deploy target. Developers may also use their personal Convex Cloud dev deployment.
- **Security headers**: the CSP and the other headers move from `public/staticwebapp.config.json` (Azure Static Web Apps format) to `vercel.json` `headers`, with the SPA fallback as a `rewrites` rule. `connect-src`, `img-src` and `media-src` allow `https://*.convex.cloud` and `wss://*.convex.cloud` for the demo, since one `vercel.json` serves both Production and Preview and the hosts are not known before the projects exist. Pin them to the exact deployment hosts before `Security level: production` (check-security S9 warning).
- **Limits**: Convex Cloud defaults (above). No self-hosted limit tuning.
- **Observability**: Convex dashboard logs per deployment; Vercel deployment logs. No error tracker (SoW §5).
- **Secrets**: deploy keys and tokens live only in GitHub Actions secrets; `DEMO_PASSWORD` lives in each Convex deployment's environment. Names only in `TOKENS.md`.

## Consequences

- OQ-2 (Azure region and public URL) is answered: no Azure; Convex EU (Ireland) and `*.vercel.app`.
- Deviation from SoW §7.1 ("the test stack on Azure"): the test stack is now Convex Cloud + Vercel. `docs/SoW.md` stays as approved; ARCHITECTURE.md §2 records the deviation. K-05 (Azure VM setup) is gone.
- `public/staticwebapp.config.json` becomes dead config once `vercel.json` exists; delete it in the same change that adds `vercel.json`.
- KI-03 (upload bytes): the Caddy `request_body` cap of 21 MB does not exist on Convex Cloud; upload URLs post straight to Convex, where "The file size is not limited" (2 minute timeout). What still holds: `requireActor` + the `upload` rate limit on `generateUploadUrl`, the server-side size check in `campaigns.create`, and the daily paginated orphan sweep. Residual risk: a signed-in viewer can store up to ~2 minutes of upload bytes per URL until the sweep deletes them (storage cost, Pro includes 100 GB). Accepted for the demo; the remedy, if needed, is an upload through an HTTP action that checks the length before storing (a spec change).
- KI-07 (global sign-in lockout): not caused by hosting; it lives in `convex/rateLimits.ts` and applies on Convex Cloud as before. The move removes the proxy we controlled, and Vercel's firewall cannot help because sign-in goes over the Convex WebSocket, not through Vercel. Status stays "open, accepted trade-off".
- KI-09 (error redaction): `REDACT_LOGS_TO_CLIENT` is a self-hosted setting. Convex Cloud production redacts by default. The development deployment behind Vercel Preview does not redact: Preview URLs show server error messages and stack traces. Acceptable with synthetic data; keep Preview URLs for the team.
- `TOKENS.md`: new GitHub secret names; self-hosted keys become "local dev only".
- The EU region cannot be changed later; a move means a new deployment plus export/import.
- The production deployment needs `DEMO_PASSWORD` set and the seed run once before the first client review; the development deployment needs its own `DEMO_PASSWORD`.
- Work this creates (deploy stage, not this ADR): the GitHub Actions workflow, `vercel.json`, the `dev` branch, and a `docs/RUNBOOK.md` update for Convex Cloud.
- Data residency: still "none"; data is synthetic. Before any real personal data, re-check residency: Kazakhstan's law asks for storage on its territory (`docs/PERSONAL-DATA.md` row 2), and this project is in Ireland.

## Open questions

- TODO(team): Vercel Preview deployment protection: keep Vercel Authentication on Preview (team only) or open it. Recommended: keep it on (the dev deployment does not redact errors).
- TODO(client): Q-02 backup needs for phase 2 (carried from ADR-0011).
- TODO(team): the real `prod` target (separate Convex project, region, domain): decided at the production deploy gate.
