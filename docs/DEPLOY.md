# Deploy: GitHub Actions + Convex Cloud (EU) + Vercel

Decision: ADR-0012 (2026-10-29). Workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`. Host config: `vercel.json`.

| Branch | Convex deployment | Vercel | GitHub environment |
| --- | --- | --- | --- |
| pull request | none (checks only) | none | none |
| `dev` | dev deployment `dev/ci` (EU) | preview | `development` |
| `main` | production (EU) | production | `production` |

Each push to `dev` or `main` runs the CI job (tsc, vitest, `npm audit --audit-level=high`), then the deploy job:
`vercel pull` -> `npx convex deploy --cmd "vercel build" --cmd-url-env-var-name VITE_CONVEX_URL` (pushes `convex/` and builds the front against that deployment URL) -> `vercel deploy --prebuilt`.
The Vercel Git integration is off (`vercel.json` `git.deploymentEnabled: false`); only the workflow deploys.

## One-time setup (manual)

1. Convex: create the project in the dashboard, region **Europe (Ireland), `aws-eu-west-1`**. The production deployment gets the region chosen at creation; it cannot be changed later.
2. Convex dev deployment for the `dev` branch (logged-in CLI, `npx convex login`):
   `npx convex deployment create dev/ci --type dev --region eu --expiration none`
3. Deploy keys, permission `deployment:deploy` only:
   - production: dashboard -> production deployment -> Settings -> Deploy keys -> Generate.
   - dev: `npx convex deployment token create github-dev --deployment dev/ci` (or the same dashboard page of `dev/ci`).
   A dev deploy key (`dev:<name>|...`) makes `npx convex deploy` push to that deployment. Preview deploy keys were not used: preview deployments expire after 5 days (14 on paid plans) and their data goes with them.
4. Convex environment variables on each deployment (see "Seed" below): `DEMO_PASSWORD`.
5. Vercel: create the project (framework **Vite**), no Git connection needed. Run `npx vercel@65.7.0 link` locally once; `.vercel/project.json` (gitignored) holds `orgId` and `projectId`. Create an account token scoped to this team/project. Do **not** set `VITE_CONVEX_URL` in Vercel: the workflow passes it at build time.
   Optional: turn off the Vercel Toolbar for previews (its script is blocked by the CSP and logs console errors).
6. GitHub -> Settings -> Environments: create `production` (deployment branches: `main` only) and `development` (`dev` only). Add these secrets to **both** environments:

| Secret | `production` value | `development` value |
| --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | production deploy key | `dev/ci` deploy key |
| `VERCEL_TOKEN` | Vercel token | same |
| `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` | same |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` | same |

CSP: `vercel.json` allows `https://*.convex.cloud` / `wss://*.convex.cloud` because the deployment hosts do not exist yet. Before the security level moves to `production`, replace the wildcard with the two real hosts (prod and `dev/ci`); the echo security check flags it (S9).

## Seed and demo password (once per deployment)

Synthetic data only. Run from a laptop with a logged-in CLI (`npx convex login`). The CI deploy key cannot do this: it only has `deployment:deploy`.

```sh
# production
npx convex env set DEMO_PASSWORD --prod    # paste the value at the prompt (>= 24 random chars); keeps it out of shell history
npx convex run demo:seed --prod            # no-op when screens already exist
# dev
npx convex env set DEMO_PASSWORD --deployment dev/ci
npx convex run demo:seed --deployment dev/ci
```

Alternative: `CONVEX_DEPLOY_KEY='<key>' npx convex run demo:seed` with a key that also has data-write and env permissions (with a deploy key set, `--prod` is ignored and `--deployment` is refused).
After rotating `DEMO_PASSWORD`: `npx convex run demo:clearSessions --prod`.

## Rollback

- Front: Vercel dashboard -> Deployments -> previous production deployment -> Instant Rollback (`npx vercel@65.7.0 rollback <url>` also works). It is a pointer change, no rebuild. It does not touch Convex.
- Backend: Convex has no one-click code rollback. Revert the bad commit on `main` (`git revert <sha>`, push) so the workflow redeploys the previous code; or check out the previous good commit and run `CONVEX_DEPLOY_KEY='<prod key>' npx convex deploy` from a laptop.
- Data: export before risky deploys (`npx convex export --prod --include-file-storage --path backups/<date>.zip`); restore with `npx convex import --prod --replace-all <zip>`. For the demo the seed plus «Сбросить демо» is the primary recovery.
- Rolling back the front alone after a schema or function change can leave the old front calling functions that changed. Roll back both sides to the same commit.
