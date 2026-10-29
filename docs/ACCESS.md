# Access and links

Environments: **production** (real data; not created yet), **test** (client acceptance, synthetic data) and the **stand** (the developer's machine).

Support commands that are not in the interface live in [RUNBOOK.md](RUNBOOK.md).
What it costs to keep this running lives in [COSTS.md](COSTS.md).

## Production

Production does not exist yet. This is deliberate.

- **Why:** the current scope holds synthetic data only (SoW §5). Real data starts with the next phase. The client has not given the data scope or the data residency rule.
- **What must be true before it exists:**
  1. The client and their lawyer answer `docs/PERSONAL-DATA.md` (every row has an answer, a name and a date).
  2. The client names the data residency rule. `CLAUDE.md` says "none" today. TODO(client): confirm where real data may be hosted.
  3. The team creates a separate Convex project and a Vercel production target, and picks the domain. TODO(echo): the production target and domain are decided at the production deploy gate (ADR-0012).
  4. The security level in `CLAUDE.md` moves from `demo` to `production`.
- **Who does it:** the Echo team, after the client answers the questions above.

Until then the **test** stack below is the only live stack. It runs on the Convex **production deployment** and on the Vercel **Production** target of this project. These names are the provider's names. They do not mean "real data".

Production accounts and passwords: sent only through a separate channel. They are never in this file.

## Test

Same stack as the client review. Synthetic data only.

| What | Address |
| --- | --- |
| **Application** | https://billboard-management-five.vercel.app |
| Backend: the API the browser talks to | https://doting-mongoose-973.convex.cloud |
| HTTP actions, webhooks | none (the product has no HTTP actions or webhooks) |
| Dashboard: data, functions, logs, cron | https://dashboard.convex.dev (log in, open the project, open the production deployment). Access is by invitation from the project owner. |
| Front-end hosting | https://vercel.com/dashboard (project `billboard-management`). Access is by invitation from the team owner. |
| Source code | https://github.com/kudaiberdi-swe/billboard-management |

Where the data lives: Convex Cloud, Europe (Ireland), `aws-eu-west-1`. The front is static files on Vercel's network. No personal data is stored. `CLAUDE.md` gives no data residency rule: "none".

Run a CLI command against the test stack (a logged-in CLI, `npx convex login`):

```bash
npx convex env list --prod
npx convex run <module>:<function> --prod
```

A team member can also use the dashboard instead of the CLI.

**What the test stack holds:** 100 synthetic screens, synthetic campaigns, a show log and audience figures (SoW F-11). The map uses OpenStreetMap tiles and needs an internet connection.

**What is deliberately absent, and why:** real LED screens, players, cameras, payments, report delivery and advertiser accounts. They are out of scope (SoW §9). The app computes audience figures and shows from the seed.

**What looks like a fault but is not:**

- The app has no user accounts. One shared password opens it. This is the design (SoW §3, D-13).
- The sign-in screen can refuse everyone for up to one minute after heavy sign-in traffic. See KI-07 in [RUNBOOK.md](RUNBOOK.md) under "Incidents".
- The «Сбросить демо» button returns the data to the seed. Changes made by viewers are lost on purpose.

### Demo accounts

Only accounts of the test stack and the stand, with synthetic data. Do not create demo accounts on production. Never write keys or secrets here.

The app has one shared password and one role. The password below is the value of the **test stack**. The stand and the dev deployment use their own values.

| Role | Login | Password | What it shows |
| --- | --- | --- | --- |
| Администратор сети | none (the sign-in screen asks only for the password) | `{{DEMO_ADMIN_PASSWORD}}` | All six sections: «Главная», «Билборды», «Рекламные кампании», «Расписание», «Аналитика аудитории», «Отчёты». Creates campaigns, simulates shows, resets the data. |

The second role in the SoW, «Рекламодатель», has no account. The advertiser gets a printed or shown report.

### Dev deployment

For the team. The `dev` branch deploys here.

| What | Address |
| --- | --- |
| Application | Vercel Preview. The URL changes with each push. It sits behind a Vercel login. Find it in the GitHub Actions `Deploy` run, or in the Vercel dashboard. |
| Backend | https://clear-hare-945.convex.cloud (deployment `dev/ci`, Europe) |

The dev deployment has its own `DEMO_PASSWORD`, different from the test stack. Ask the team.

## The stand

```bash
npm install
npx convex dev        # prints VITE_CONVEX_URL; or: npx convex dev --local
npx convex run demo:seed
npm run dev           # the front
```

Set `DEMO_PASSWORD` on the stand deployment first (24 characters or more), or nobody can sign in:

```bash
npx convex env set DEMO_PASSWORD     # paste the value at the prompt
```

`npx convex dev` pushes the local code to the shared dev deployment. Use `--local` to avoid that.

The self-hosted stack in `deploy/compose` is for local development and end-to-end runs only. No deployed stack uses it.

### Stand accounts

The stand runs the same seed as the test stack. It has the same single role and one shared password: see "Demo accounts" under Test. The same rules apply.

Stand accounts do not reach production and must not.

## Who has access to what

Names are never in this file. TODO(client): the client names who may be invited to each service.

| Item | Held by | Notes |
| --- | --- | --- |
| Convex dashboard (test and dev deployments) | Echo team; the client by invitation | Invitation from the Convex project owner. Dashboard access is never shared in this file. |
| Vercel dashboard | Echo team | Invitation from the Vercel team owner. |
| GitHub repository and Actions | Echo team | Repo `kudaiberdi-swe/billboard-management`. |
| Application password (test stack) | Echo team and the client | Sent through a separate channel. Rotation: [RUNBOOK.md](RUNBOOK.md). |

## Where the real secrets are

| Secret | Where it lives | Who holds it |
| --- | --- | --- |
| `DEMO_PASSWORD` (per deployment) | Convex environment variables of each deployment | Echo team |
| `CONVEX_DEPLOY_KEY` (production and `dev/ci` differ) | GitHub environments `production` and `development` | Echo team |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | GitHub environments `production` and `development` | Echo team |

TODO(echo): name the team secret store and vault. The repository does not name one. No secret is in the repository. See [TOKENS.md](../TOKENS.md) for the names and who issues them.
