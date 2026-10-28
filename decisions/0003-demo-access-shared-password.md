# 0003. Demo access with one shared password

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

D-13: one shared password; all viewers share data. The demo has no user accounts or permission system (ТЗ §4, SoW §3). F-1 AC3, AC4: without the password only the password screen shows; a wrong password shows an error and does not open the app. Project `CLAUDE.md`: "Permissions are enforced server-side in Convex functions." Hiding the app in the UI alone does not protect the Convex API, which is reachable directly by URL. No personal data is stored (ADR-0004). Risk K-04: the password can leak.

## Options

1. **Session table in Convex, password in a Convex environment variable**: the browser makes a random session ID (`crypto.randomUUID()` in the browser), stores it in `localStorage`, and calls the mutation `demo.signIn({ sessionId, password })`. The mutation compares the password with the env var `DEMO_PASSWORD` and, on match, inserts `demoSessions { sessionId, expiresAt }`. Every public query and mutation takes `sessionId` and first calls `requireActor(ctx, sessionId)`, which throws an "unauthenticated" error when the session is missing or expired. Pros: server-side control, no extra services, works the same on local and Azure, about 30 lines. Cons: `sessionId` is an argument on every function (the front wraps `useQuery`/`useMutation` once to add it).
2. **Convex Auth (Password provider) with one seeded account**: Pros: standard auth, JWTs. Cons: self-hosted needs the manual setup (JWT keys, JWKS env vars; the CLI setup does not support self-hosted, per the self-hosted README, verified 2026-10-28); accounts and user tables the SoW does not need.
3. **HTTP basic auth on the reverse proxy only**: Pros: zero app code. Cons: not enforced in Convex functions (breaks the project rule); the Convex WebSocket and HTTP endpoints stay open unless proxied carefully; does not exist on the local stack.

## Decision

Option 1. Details:

- `DEMO_PASSWORD` lives only in the Convex deployment env (`npx convex env set`), never in the bundle or git. Key name goes to `TOKENS.md`. The value is a long random string (16+ characters), so guessing it online is not practical without a rate limiter.
- Session lifetime: 7 days from sign-in; a «Выйти» control is not required by the SoW and is not built.
- `requireActor` is the single guard; every public function calls it first. The `.fde-echo.json` authz check looks for this guard name. Internal functions (seed run from the CLI) are `internalMutation` and need no session.
- «Сбросить демо» does not delete `demoSessions`, so viewers stay signed in after a reset.
- Changing the password: set a new env value and delete all `demoSessions` rows (one internal mutation), which signs everyone out.

## Consequences

- Strangers without the password get only errors from the API, not data.
- Every viewer has the same rights (single role R-1); there is no per-user audit (SoW §5: no audit log).
- No brute-force throttle in phase 1. shortcut: relies on a long random password; add a rate limit on `demo.signIn` if the demo stays public after the meeting.
- `sessionId` in `localStorage` is readable by any script on the page; acceptable at security level demo with no personal data.

## Open questions

None.
