# Spec Delta

## Purpose

Protects the whole demo with one shared password and enforces it on the server, so that no data or action is reachable without a valid demo session.

## ADDED Requirements

### Requirement: Shared password sign-in
The system SHALL open a demo session only when the submitted password equals the Convex environment value `DEMO_PASSWORD`. A session lasts 7 days from sign-in. All sessions have the same single role R-1 «Администратор сети / владелец билбордов».

#### Scenario: correct password creates a session
- **WHEN** a visitor calls `demo.signIn` with a new `sessionId` and the password equal to `DEMO_PASSWORD`
- **THEN** the call returns `{ ok: true }`
- **AND** `demo.sessionStatus` for that `sessionId` returns `{ valid: true }`

#### Scenario: wrong password creates no session
- **WHEN** a visitor calls `demo.signIn` with a password that differs from `DEMO_PASSWORD`
- **THEN** the call returns `{ ok: false, code: "WRONG_PASSWORD" }`
- **AND** `demo.sessionStatus` for that `sessionId` returns `{ valid: false }`

#### Scenario: missing env password never signs in
- **WHEN** `DEMO_PASSWORD` is not set and a visitor calls `demo.signIn` with any password, including an empty one
- **THEN** the call returns `{ ok: false, code: "WRONG_PASSWORD" }`

#### Scenario: malformed session id is rejected
- **WHEN** a visitor calls `demo.signIn` with a `sessionId` that is not a UUID string of 36 characters
- **THEN** the call fails with error code `INVALID_INPUT`
- **AND** no session row is written

#### Scenario: session expires after 7 days
- **WHEN** 7 days have passed since a session was created
- **THEN** `demo.sessionStatus` for it returns `{ valid: false }`
- **AND** a guarded function called with it fails with error code `UNAUTHENTICATED`

#### Scenario: signing in again extends the session
- **WHEN** a visitor with an existing session calls `demo.signIn` again with the same `sessionId` and the correct password
- **THEN** only one session row exists for that `sessionId`
- **AND** its expiry is 7 days from the second sign-in

### Requirement: Sign-in rate limit
Every `demo.signIn` call with a well-formed `sessionId` SHALL consume the per-session bucket `signInPerAccount` (5 attempts, refill 10 per 15 minutes) and the global bucket `signInGlobal` (300 per minute). Over either limit the call SHALL fail with `RATE_LIMITED` before the password is checked. A wrong password SHALL return a result, not throw, so the attempt stays counted. A correct password resets the per-session bucket.

#### Scenario: too many sign-in attempts
- **WHEN** a visitor calls `demo.signIn` 5 times with the same `sessionId` and a wrong password, then a 6th time with the correct password
- **THEN** the 6th call fails with a `RateLimited` error (code `RATE_LIMITED`)
- **AND** no session row is written for that `sessionId`
- **AND** the password screen shows «Слишком много попыток. Повторите через {minutes} мин.»

#### Scenario: wrong attempts stay counted
- **WHEN** a visitor makes 5 wrong `demo.signIn` attempts with one `sessionId`
- **THEN** the per-session bucket is empty, because no wrong attempt was rolled back

#### Scenario: global sign-in bucket
- **WHEN** 300 `demo.signIn` calls with different `sessionId` values arrive within one minute
- **THEN** the next call with a fresh `sessionId` fails with `RATE_LIMITED`

#### Scenario: parallel sign-in attempts cannot pass the limit
- **WHEN** 10 `demo.signIn` calls with the same `sessionId` run in parallel
- **THEN** at most 5 of them reach the password check

#### Scenario: correct password resets the session bucket
- **WHEN** a visitor makes 4 wrong attempts and then signs in with the correct password using the same `sessionId`
- **THEN** the per-session bucket is full again

### Requirement: Server-side guard on every public function
Every public Convex query and mutation except `demo.signIn` and `demo.sessionStatus` SHALL take `sessionId` and call `requireActor(ctx, sessionId)` before it reads or writes data. A call without a valid session SHALL fail with `UNAUTHENTICATED` and return no data.

#### Scenario: guarded query without a session
- **WHEN** a caller calls `screens.options` with a `sessionId` that has no session row
- **THEN** the call fails with error code `UNAUTHENTICATED`
- **AND** no screen data is returned

#### Scenario: guarded mutation without a session
- **WHEN** a caller calls `demo.reset` with an unknown `sessionId`
- **THEN** the call fails with error code `UNAUTHENTICATED`
- **AND** no table changes

#### Scenario: guarded call with a valid session
- **WHEN** a signed-in visitor calls `screens.options` with its `sessionId`
- **THEN** the call returns the screens

#### Scenario: session status reveals no data
- **WHEN** a caller calls `demo.sessionStatus` with any `sessionId`
- **THEN** the result is only `{ valid: true }` or `{ valid: false }`

### Requirement: Password changes sign everyone out
The internal function `demo.clearSessions` SHALL delete every session row, so that after a password change every viewer must enter the new password.

#### Scenario: clear sessions signs everyone out
- **WHEN** the team runs `demo.clearSessions` from the CLI
- **THEN** every existing `sessionId` gets `{ valid: false }` from `demo.sessionStatus`

#### Scenario: clear sessions is not public
- **WHEN** a browser client tries to call `demo.clearSessions` or `demo.seed`
- **THEN** the Convex client cannot call them, because they are internal functions
