# Known issues

QA failures still open after the round 3 re-examination.

## KI-01: spec gate reports SoW 4.1 in no change
- Wave: specs; change: none; found: 2026-10-28
- Check: `FAIL gap coverage: SoW function 4.1 is in no change`
- Reproduce: `node "<plugin>/skills/specs/scripts/spec-gate.mjs"`
- Evidence: F-1 (navigation, demo labels, access, reset) is built and archived in `openspec/changes/archive/2026-10-28-base-contract/` (proposal: "SoW functions: 4.1, 4.11"). The gate reads only active changes.
- Re-examination: false gap; the function is covered by the archived base contract. No spec work needed.
- Status: fixed 369f15c (false gap; F-1/F-11 confirmed by the final e2e run 1)

## KI-02: spec gate reports SoW 4.11 in no change
- Wave: specs; change: none; found: 2026-10-28
- Check: `FAIL gap coverage: SoW function 4.11 is in no change`
- Reproduce: `node "<plugin>/skills/specs/scripts/spec-gate.mjs"`
- Evidence: F-11 (demo seed data) is built and archived in `openspec/changes/archive/2026-10-28-base-contract/` (proposal: "SoW functions: 4.1, 4.11"). The gate reads only active changes.
- Re-examination: false gap; the function is covered by the archived base contract. No spec work needed.
- Status: fixed 369f15c (false gap; F-1/F-11 confirmed by the final e2e run 1)

## KI-03: Upload URLs store unbounded bytes and the orphan sweep cannot keep up with the allowed issuance rate
- Wave: security audit (run 1); change: none; found: 2026-10-29
- Check: convex/campaigns.ts:generateUploadUrl:unbounded-upload-bytes-and-orphan-backlog Upload URLs store unbounded bytes and the orphan sweep cannot keep up with the allowed issuance rate
- Reproduce: `see .echo/security-audit/run-1/NEEDS-VALIDATION.md (local plan; needs an approved sandbox)`
- Evidence: convex/campaigns.ts:235 → convex/campaigns.ts:260. Details stay in the git-ignored run directory.
- Re-examination: needs validation: Target code was not executed (no OS-enforced sandbox or promotion helper in this run), so backlog growth across sweep runs was not observed locally.
- Status: fixed 844f7d5 (paginated orphan sweep; Caddy request_body 21MB on /api/storage/upload)
- Re-assessment (ADR-0012, 2026-10-29): on Convex Cloud there is no Caddy; upload URLs post straight to Convex ("The file size is not limited, but upload POST request has a 2 minute timeout", docs.convex.dev/file-storage/upload-files). Still in force: session + `upload` rate limit on `generateUploadUrl`, size/type check in `campaigns.create`, daily orphan sweep. Residual: up to ~2 min of bytes per upload URL stored until the sweep; accepted for the demo (synthetic data, Pro storage quota). The Caddy cap applies to the local compose stack only.

## KI-04: Viewer-grown showLog breaks shared campaign list and default dashboard via unbounded collects
- Wave: security audit (run 1); change: none; found: 2026-10-29
- Check: convex/campaigns.ts:list+convex/dashboard.ts:summary:unbounded-showLog-collect Viewer-grown showLog breaks shared campaign list and default dashboard via unbounded collects
- Reproduce: `see .echo/security-audit/run-1/NEEDS-VALIDATION.md (local plan; needs an approved sandbox)`
- Evidence: convex/campaigns.ts:216 → convex/dashboard.ts:70. Details stay in the git-ignored run directory.
- Re-examination: needs validation: Target code may not be executed in this run: there is no OS-enforced sandbox and the promotion allowlist is empty. So the read-limit or 1 s timeout failure of campaigns.list and dashboard.summary cannot be observed locally.
- Status: fixed 844f7d5 (dashboard reads by campaign; simulate keeps the whole log under LOG_ROW_BUDGET)

## KI-05: A date range that ends on 9999-12-31 makes datesInRange loop forever
- Wave: security audit (run 1); change: none; found: 2026-10-29
- Check: convex/lib/time.ts:datesInRange:year-10000-rollover-unbounded-loop A date range that ends on 9999-12-31 makes datesInRange loop forever
- Reproduce: `see .echo/security-audit/run-1/NEEDS-VALIDATION.md (local plan; needs an approved sandbox)`
- Evidence: convex/analytics.ts:42 → convex/lib/time.ts:42. Details stay in the git-ignored run directory.
- Re-examination: needs validation: This run has no OS-enforced sandbox and no promotion helper. I could not observe in a bounded run whether V8 (the Convex runtime) parses '+010000-01T00:00:00Z' to 10000-01-01, which gives an unbounded loop until the time or memory limit, or to NaN, which gives a RangeError. I also could not observe datesInRange('9999-12-31','9999-12-31') running past one element.
- Status: fixed 844f7d5 (dates limited to 2000-2100; datesInRange bounded by day count)

## KI-06: Anonymous sign-in attempts with rotating sessionIds create permanent rate-limiter rows
- Wave: security audit (run 1); change: none; found: 2026-10-29
- Check: convex/rateLimits.ts:enforceRateLimit:per-caller-key-rows-never-expire Anonymous sign-in attempts with rotating sessionIds create permanent rate-limiter rows
- Reproduce: `see .echo/security-audit/run-1/NEEDS-VALIDATION.md (local plan; needs an approved sandbox)`
- Evidence: convex/demo.ts:44 → convex/demo.ts:60. Details stay in the git-ignored run directory.
- Re-examination: needs validation: Whether this matters depends on things outside the repository: the deployed Postgres volume size, disk alerting, and the retention and backup behaviour of the self-hosted Convex backend (document history increases the bytes per row).
- Status: fixed 844f7d5 (daily crons purge expired sessions and old rate-limit rows)

## KI-07: Anonymous caller can drain the global sign-in bucket and lock every viewer out of sign-in
- Wave: security audit (run 1); change: none; found: 2026-10-29
- Check: convex/rateLimits.ts:signInGlobal:shared-unkeyed-bucket-signin-lockout Anonymous caller can drain the global sign-in bucket and lock every viewer out of sign-in
- Reproduce: `see .echo/security-audit/run-1/NEEDS-VALIDATION.md (local plan; needs an approved sandbox)`
- Evidence: convex/demo.ts:44 → convex/rateLimits.ts:47. Details stay in the git-ignored run directory.
- Re-examination: needs validation: Running target code is not allowed in this run: there is no OS-enforced sandbox with memory, disk and time limits, and no artifact promotion helper. So convex/security.test.ts:98-102 was not run, and there is no locally observed lockout to cite.
- Status: open — accepted trade-off: the spec fixes the shared 300/min sign-in bucket; real remedy is IP-keyed sign-in via an HTTP action (spec/design change), documented in convex/rateLimits.ts
- Re-assessment (ADR-0012, 2026-10-29): unchanged by the move to Convex Cloud; the bucket is app code. No proxy of ours sits in front any more, and Vercel's firewall cannot see sign-in calls (they ride the Convex WebSocket). Stays open.

## KI-08: Campaign count drives superlinear CPU in screens.list and campaigns.list past the 1 s UDF timeout
- Wave: security audit (run 1); change: none; found: 2026-10-29
- Check: convex/screens.ts:list+convex/campaigns.ts:list:campaign-count-cpu-amplification Campaign count drives superlinear CPU in screens.list and campaigns.list past the 1 s UDF timeout
- Reproduce: `see .echo/security-audit/run-1/NEEDS-VALIDATION.md (local plan; needs an approved sandbox)`
- Evidence: convex/campaigns.ts:216 → convex/campaigns.ts:32. Details stay in the git-ignored run directory.
- Re-examination: needs validation: Whether screens.list or campaigns.list actually exceeds the 1 s user-time limit at 200 campaigns x 100 screens depends on execution (V8 speed on the deployed backend). This run has no OS-enforced sandbox and an empty promotion allowlist, so target code was not executed. The repository has no scale or timing test at MAX_CAMPAIGNS.
- Status: fixed 844f7d5 (campaign index built once per query; closed-form plan; 200x100 lists 25 ms / 161 ms)

## KI-09: Public VM .env copied from .env.example disables Convex client error redaction
- Wave: security audit (run 1); change: none; found: 2026-10-29
- Check: deploy/compose/docker-compose.yml:REDACT_LOGS_TO_CLIENT:env-example-empty-disables-redaction Public VM .env copied from .env.example disables Convex client error redaction
- Reproduce: `see .echo/security-audit/run-1/NEEDS-VALIDATION.md (local plan; needs an approved sandbox)`
- Evidence: deploy/compose/README.md:38 → deploy/compose/Caddyfile:9. Details stay in the git-ignored run directory.
- Re-examination: needs validation: The real test or production VM .env is gitignored (.gitignore:10) and not in the repository. Whether REDACT_LOGS_TO_CLIENT is empty or 1 on the deployed backend is unknown, and that fact decides the outcome.
- Status: fixed 844f7d5 (.env.example ships REDACT_LOGS_TO_CLIENT=1; README updated)
- Re-assessment (ADR-0012, 2026-10-29): self-hosted setting, local compose only. Convex Cloud production redacts by default; the development deployment behind Vercel Preview does not (docs.convex.dev/functions/error-handling). Synthetic data; keep Preview URLs for the team.
