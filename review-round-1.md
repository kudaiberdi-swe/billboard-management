# Wave 2 review round 1 findings

## f08-audience-analytics
- convex/analytics.ts:34 [QA FAIL, blocks deploy] returns validator uses object keys "18-24", "25-34", ... for `audience.profile.age`. Convex deploy rejects non-identifier object validator keys:
  `start_push 400 Bad Request ... Invalid validator for key audience: Invalid validator for key profile: Invalid validator for key age: Invalid first character '1' in 18-24: Identifiers must start with an alphabetic character or underscore`.
  Fix inside f08 only (do NOT change the locked convex/lib/analytics.ts signature): map the profile in `analytics.screenPeriod` to a list, e.g. `age: [{ group: "18-24", share: number }, ...]` (and gender the same way if its keys are not identifiers), update the returns validator, the UI (src/routes/analytics/Blocks.tsx) and tests. Check every other public returns validator in convex/ (dashboard, reports, screens, campaigns, schedule, showLog) for non-identifier keys and fix the same way if found.
  Failing tests: none in vitest (convex-test does not validate validator key names); the failing check is the deploy.
  Reproduce: start the local self-hosted stack (deploy/compose, `--pull never`), then `npx convex deploy --yes` against it.
