Status: approved 2026-10-29 (auto)

# Security audit summary

- Run: `.echo/security-audit/run-1/` (git-ignored), profile standard, source ref 04dac55028c70441abd1db9f4c9d1176b65f59fd, date 2026-10-29, agent calls 36 of 60, run_status complete.
- Coverage: 19 coverage units (candidate 7, covered 11, blocked 1). Three hunter waves; the post-wave critic and a distinct final-clean critic both found no remaining gap. Source-only run: no target code executed (no OS-enforced sandbox available), so execution-dependent leads are needs_validation. One unit is blocked on dependency known-CVE status (network-only check; the pipeline scan check reports npm audit 0).
- Result: 0 confirmed findings (no critical, high, medium or low). 7 needs_validation leads, all availability or hardening, each in docs/KNOWN-ISSUES.md.

| Fingerprint | Verdict | Severity | Title | `path:line` | Result |
| --- | --- | --- | --- | --- | --- |
| `convex/campaigns.ts:generateUploadUrl:unbounded-upload-bytes-and-orphan-backlog` | needs_validation | - | Upload URLs store unbounded bytes and the orphan sweep cannot keep up with the allowed issuance rate | `convex/campaigns.ts:235` | KI-03 |
| `convex/campaigns.ts:list+convex/dashboard.ts:summary:unbounded-showLog-collect` | needs_validation | - | Viewer-grown showLog breaks shared campaign list and default dashboard via unbounded collects | `convex/campaigns.ts:216` | KI-04 |
| `convex/lib/time.ts:datesInRange:year-10000-rollover-unbounded-loop` | needs_validation | - | A date range that ends on 9999-12-31 makes datesInRange loop forever | `convex/analytics.ts:42` | KI-05 |
| `convex/rateLimits.ts:enforceRateLimit:per-caller-key-rows-never-expire` | needs_validation | - | Anonymous sign-in attempts with rotating sessionIds create permanent rate-limiter rows | `convex/demo.ts:44` | KI-06 |
| `convex/rateLimits.ts:signInGlobal:shared-unkeyed-bucket-signin-lockout` | needs_validation | - | Anonymous caller can drain the global sign-in bucket and lock every viewer out of sign-in | `convex/demo.ts:44` | KI-07 |
| `convex/screens.ts:list+convex/campaigns.ts:list:campaign-count-cpu-amplification` | needs_validation | - | Campaign count drives superlinear CPU in screens.list and campaigns.list past the 1 s UDF timeout | `convex/campaigns.ts:216` | KI-08 |
| `deploy/compose/docker-compose.yml:REDACT_LOGS_TO_CLIENT:env-example-empty-disables-redaction` | needs_validation | - | Public VM .env copied from .env.example disables Convex client error redaction | `deploy/compose/README.md:38` | KI-09 |
