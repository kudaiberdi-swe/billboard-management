# What support does by hand

Commands that are not in the interface, and why they are not. A permission that a screen grants itself is a hole. The commands below are `internalMutation` functions or CLI actions. The browser cannot reach them. Whoever holds access to the deployment runs them.

Hosting: Convex Cloud (Europe, Ireland) for the backend, Vercel for the front, GitHub Actions for deploys (ADR-0012). Details of the setup: [DEPLOY.md](DEPLOY.md). Addresses: [ACCESS.md](ACCESS.md).

Log in to the CLI once: `npx convex login`.

```bash
# test stack (the Convex production deployment)
npx convex run <module>:<function> '<json>' --prod
# dev deployment
npx convex run <module>:<function> '<json>' --deployment dev/ci
```

If `CONVEX_DEPLOY_KEY` is set in your shell, the CLI ignores `--prod` and refuses `--deployment`. The deploy key only has the right to deploy. Unset it for these commands.

---

## Deploy from a clean machine

You need Node 24, git and a GitHub account with access to the repository.

Normal deploy (no local tools needed):

1. Merge the change to `dev`. GitHub Actions run `Deploy`: CI (`tsc`, `vitest`, `npm audit --audit-level=high`), then the Convex deploy and the Vercel preview deploy.
2. Check the dev deployment.
3. Merge `dev` to `main`. The same workflow deploys to the Convex production deployment and to Vercel Production.
4. Open the application URL from [ACCESS.md](ACCESS.md). Sign in. Open «Главная».

A pull request runs CI only. It deploys nothing. The Vercel Git integration is off on purpose: only the workflow deploys.

Manual deploy of the backend from a clean machine (when GitHub Actions is down):

```bash
git clone https://github.com/kudaiberdi-swe/billboard-management.git
cd billboard-management
npm ci
CONVEX_DEPLOY_KEY='<production deploy key>' npx convex deploy
```

The key comes from the secret store (TODO(echo): name it, see [ACCESS.md](ACCESS.md)). Do not write it to a file in the repository. This command pushes the backend only. Redeploy the front through GitHub Actions, or `vercel deploy --prebuilt --prod` after `vercel build --prod`.

Build the front against the right backend. The workflow does it with `npx convex deploy --cmd "vercel build" --cmd-url-env-var-name VITE_CONVEX_URL`. Do not set `VITE_CONVEX_URL` in the Vercel project.

One-time setup of a new project (accounts, deploy keys, GitHub environments): [DEPLOY.md](DEPLOY.md), "One-time setup".

---

## Accounts and passwords

### Rotate the application password

The app has no user accounts. One shared password, in the Convex environment variable `DEMO_PASSWORD`, opens it. It must have 24 characters or more. If it is unset or shorter, nobody can sign in.

Why it is not a screen: a screen that changes the password is a screen that locks the client out.

```bash
npx convex env set DEMO_PASSWORD --prod        # paste the new value at the prompt
npx convex run demo:clearSessions --prod
```

Expected answer: `clearSessions` returns the number of sessions it deleted. Every viewer signs in again.
Use a different value on each deployment (test stack, dev, stand). Send the new value to the client through a separate channel. Never write it in a file or a ticket.

### Fill the data (seed)

Run once per deployment. It is safe to repeat: it does nothing when screens already exist.

```bash
npx convex run demo:seed --prod
```

Expected answer: `null`. The app shows 100 screens.

To return the data to the seed state, a signed-in viewer uses the button «Сбросить демо». It deletes the campaigns and their show log, and restores the seed. Support can do the same from the dashboard (function `demo:reset`).

---

## Backups

Schedule: daily, automatic. The Convex Cloud backup setting is on for the production deployment, with file storage included. This is a team setting in the Convex dashboard (Deployment settings, Backups).
Retention: TODO(echo): read the retention days from the dashboard Backups page and write them here. The Convex pricing page does not state them.
Storage: Convex Cloud, in the same region as the data (Europe, Ireland). Backups count toward the file storage quota of the plan.

Take a manual backup before every deploy that changes the schema (`convex/schema.ts`):

- Dashboard: Backups, "Backup now" (tick "Include file storage").
- Or the CLI:

```bash
npx convex export --prod --include-file-storage --path backups/convex-$(date +%F).zip
```

Keep the `backups/` folder out of git. The data is synthetic today. Treat any future export as sensitive.

Check after each backup: the backup shows in the dashboard list (or the file exists and its size is not zero), and the command printed no error.

For the current scope the seed and «Сбросить демо» are the first recovery step (SoW §5). Use a backup when the seed is not enough.

TODO(client): backup needs for the next phase (frequency, retention, storage), SoW Q-02.

## Restore drill

Status: **not run yet.** It must run before client acceptance, then once per quarter and after every change of hosting. Record each run in the table.

Run it into the dev deployment, never into the test stack:

1. Pick the latest backup of the production deployment. Download it from the dashboard (Backups, Download), or export a fresh one with the CLI command above.
2. Restore it into the dev deployment: `npx convex import --deployment dev/ci --replace-all <zip>`. The dashboard Backups page can also restore into another deployment.
3. Compare the document counts of the main tables (`screens`, `campaigns`, `showLog`, `screenEvents`) in the dashboard Data page, production against dev.
4. Open the dev application. Sign in with the dev password. Open «Билборды» and «Рекламные кампании». Check that a campaign with an image opens.
5. Write the time the restore took.

A restore into `dev/ci` replaces its data. That is fine: the dev data is synthetic.

To restore the **test stack** itself after a real loss: stop, ask the owner, take a fresh backup of the current state first, then restore with the dashboard Backups page or `npx convex import --prod --replace-all <zip>`. Run `demo:clearSessions` afterwards.

| Date | Stack | Backup used | Result | By |
| --- | --- | --- | --- | --- |
| TODO(echo): not run yet | | | | |

Last restore drill date: TODO(echo).

---

## Releasing and upgrading

### Release an app change

Front and backend ship together in one workflow run. Merge to `dev`, check, merge to `main`. See "Deploy from a clean machine".

### Upgrade the Convex backend

Convex Cloud runs the server. The team does not host it. To upgrade the client library:

1. Take a manual backup (above).
2. In a branch: `npm install convex@latest`. Read the Convex release notes for breaking changes.
3. Run `npx tsc --noEmit` and `npx vitest run`.
4. Merge to `dev`. Let the workflow deploy to the dev deployment. Sign in. Create a campaign.
5. Merge to `main`.

### Roll back

- **Front:** Vercel dashboard, Deployments, pick the previous production deployment, Instant Rollback. Or `npx vercel@65.7.0 rollback <deployment url>`. It changes a pointer and does not rebuild. It does not touch Convex.
- **Backend:** Convex has no one-click code rollback. Revert the bad commit on `main` (`git revert <sha>`) and push. The workflow deploys the previous code. In an emergency: check out the last good commit and run `CONVEX_DEPLOY_KEY='<production deploy key>' npx convex deploy` on a laptop.
- **Data:** restore a backup (above).
- Roll back both sides to the same commit. A front rolled back alone can call backend functions that changed.

---

## Incidents

First, check the status pages: Convex https://status.convex.dev and Vercel https://www.vercel-status.com. TODO(echo): confirm both addresses at the first incident. Read the logs: Convex dashboard, Logs (backend); Vercel dashboard, Deployments (front); GitHub, Actions (deploys). The product has no error tracker (SoW §5).

| Symptom | Cause | Action |
| --- | --- | --- |
| Nobody can sign in. The screen says to wait. | KI-07: one shared bucket allows 300 sign-in attempts a minute. A burst of attempts empties it. People already signed in are not affected. | Wait one minute. Try again. Real fix needs a design change (sign-in limit per IP through an HTTP action). It is an accepted trade-off today. |
| Nobody can sign in. The password is refused. | `DEMO_PASSWORD` is unset or shorter than 24 characters, or it was rotated. | `npx convex env list --prod` shows the names. Set the variable. Run `demo:clearSessions`. |
| One person is refused for a while. | The per-session limit: 5 tries, refilled at 10 per 15 minutes. | Wait. Check the password. |
| The map is grey, the list works. | The browser cannot load OpenStreetMap tiles (no internet, or the tile server limits traffic: SoW K-03). | Check the internet. The list works without the map (SoW D-7). For heavy use choose another tile provider. |
| Image upload fails. | The upload rate limit (20 per hour per session) or the file is too big or the wrong type. | Wait. Check the file. |
| White screen after a deploy. | The front calls a backend that changed. | Roll back both sides to the same commit. |
| The deploy workflow is red. | CI failed (type check, tests or `npm audit`), or a secret is wrong or expired. | Read the failed step in GitHub Actions. Nothing deployed if CI failed. For secrets see [TOKENS.md](../TOKENS.md). |
| The page does not load at all. | Vercel or Convex outage. | Check the status pages. Wait. Tell the client. |
| Data looks wrong or lost. | A viewer used «Сбросить демо», or a bad deploy. | Run `demo:seed` (no-op when screens exist), or restore a backup. |

The Vercel Preview of the dev branch shows server error messages and stack traces to anyone who can open it. Keep Preview URLs inside the team (ADR-0012, KI-09).

Security note for later: `vercel.json` allows `https://*.convex.cloud` in the CSP. Before the security level moves to `production`, replace the wildcard with the real hosts (DEPLOY.md, S9).
