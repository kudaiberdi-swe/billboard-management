# Infrastructure estimate

What it costs to keep the platform running, and how that grows with the audience. Prepared 2026-10-29 by the Echo team for the client. Hand-over file: `docs/COSTS.md` (not the build cost report in `costs/COSTS.md`).

Currency: all amounts are in USD, as the providers bill them. TODO(echo): add a local-currency rate (tenge) and its date if the client wants one. No rate was given in the inputs.

Prices come from the providers' public pricing pages, read on **2026-10-29**: https://www.convex.dev/pricing and https://vercel.com/pricing. Prices change. Check the pages before you budget. Taxes are not included.

> **What this estimate does not include.** Team salaries, marketing, lawyers and moderators. This is infrastructure, not a project budget.

Plans in use (the team's choice, ADR-0012): **Convex Professional** and **Vercel Pro**.

---

## 1. Fixed, regardless of user count

| Item | Price | Per year |
| --- | --- | --- |
| Convex Cloud, Professional plan | $25 per developer per month. Includes daily backups. | $300 per developer (1 developer: $300) |
| Front-end hosting, Vercel Pro | $20 per month per developer seat. Includes a $20 monthly usage credit. Viewer seats are free. | $240 per developer (1 developer: $240) |
| Backup storage | Included in the Convex plan. It counts toward the file storage quota (50 GB included). | $0 |
| Domain and TLS | TLS is included with Vercel. The `*.vercel.app` address is free. A custom domain: TODO(client): does the client want one, and which? Registrar price: TODO(echo). | TODO(echo) |
| Azure, VMs, managed Postgres | Not used. No servers to run. | $0 |
| Apple Developer Program, Google Play Console | Not used. The product is a desktop web app, no mobile app (SoW §9.9). | $0 |

**Total at launch:** roughly **$45 a month** ($540 a year) for one developer seat on each service, plus a domain if the client wants one.

Each extra developer who needs a seat adds $25 (Convex) and $20 (Vercel) a month. TODO(client): who needs a seat after hand-over. A client who only views the app needs no seat: the app is open to anyone with the password, and Vercel viewer seats are free.

---

## 2. What grows with the audience

### Backend

Convex Professional includes, per month (pricing page, 2026-10-29):

| Resource | Included | Beyond that |
| --- | --- | --- |
| Function calls | 25 million | $2 per additional 1 million |
| Action compute | 250 GB-hours | $0.30 per additional GB-hour |
| Database storage | 50 GB | $0.20 per additional GB |
| File storage (includes backups) | 50 GB | $0.20 per additional GB |
| Data egress | 50 GB | $0.12 per additional GB |

The pricing page also lists database bandwidth and file bandwidth. TODO(echo): add them if the app grows past the included amounts.

What drives usage in this product: viewers who keep the app open (live subscriptions count as function calls), uploaded campaign images, the show log, and the daily jobs (orphan upload sweep, session and rate-limit cleanup). The scope is 100 screens and low traffic (SoW §5, K-03). TODO(client): expected number of users and response time (SoW Q-03). With these numbers the included amounts should be enough. TODO(echo): measure real usage in the Convex dashboard Usage page after one month and replace this sentence with the numbers.

### Front

Vercel Pro includes a $20 monthly usage credit across resources. The front is static files plus security headers, so usage is small. Beyond the credit, Vercel bills by use. Spend management is on by default with a $200 on-demand budget (Vercel pricing FAQ). TODO(echo): check the real figure on the Vercel Usage page after one month.

### Map tiles

OpenStreetMap tiles are free but limited for heavy or commercial use (SoW K-03). A paid tile provider may be needed later. TODO(client): decide before the next phase. Price: TODO(echo).

### Model inference

None. No feature in the product calls an AI model (SoW §4, §9). Cost: $0.

---

## 3. What would change the shape

- **A data residency rule for real data.** If the client requires data in Kazakhstan, Convex Cloud (EU, Ireland) may not be allowed. The backend would move to a self-hosted Convex in the allowed country. That adds VMs, a managed database, backup storage and ops work. TODO(client): the rule (`docs/PERSONAL-DATA.md`).
- **A separate production project.** Real data needs its own Convex project and Vercel target. Plan a second set of seats and usage. The fixed cost for the second Convex project follows the plan terms: TODO(echo): check with Convex whether a second project adds a per-developer fee.
- **A second region** doubles the managed costs.
- **Real screens, players, cameras, payments or advertiser accounts** (next phase, SoW §9). Each adds a provider and a bill. TODO(client): scope.
- **A custom domain or email** adds a registrar fee.
