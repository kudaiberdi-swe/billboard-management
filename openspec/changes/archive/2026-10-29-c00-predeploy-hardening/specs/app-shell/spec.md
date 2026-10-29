## ADDED Requirements

### Requirement: Sign out in this browser
The menu SHALL have the button «Выйти» under «Сбросить демо». A click SHALL forget the session id stored in this browser and show the password screen at once, with no menu and no data. Sign-out is client-side only: the server session row is not deleted, and it stays valid until it expires (spec `demo-access`, 7 days) or the daily cleanup removes it after expiry (spec `scheduled-cleanup`). The next sign-in in this browser uses a new session id.

#### Scenario: sign out returns to the password screen
- **WHEN** a signed-in visitor on `/campaigns` clicks «Выйти»
- **THEN** the password screen shows at `/login`, with no menu
- **AND** the session id stored in the browser differs from the one before the click

#### Scenario: sign out keeps the server session
- **WHEN** a signed-in visitor clicks «Выйти»
- **THEN** the click deletes no session row on the server
- **AND** `demo.sessionStatus` for the old session id still returns `{ valid: true }` until its expiry
