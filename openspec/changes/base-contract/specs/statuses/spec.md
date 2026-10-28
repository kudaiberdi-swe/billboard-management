# Spec Delta

## Purpose

Defines the campaign and screen statuses and the notification rule for «Главная», so that the list, the card, the dashboard and the report always show the same status.

## ADDED Requirements

### Requirement: Campaign status from the dates
A campaign status SHALL be computed from its dates and today (UTC+5), never stored: before the start date «Запланирована» (`planned`), from the start date to the end date «Активна» (`active`), after the end date «Завершена» (`finished`) (D-6).

#### Scenario: campaign before the start
- **WHEN** today is 2026-10-31 and a campaign runs 2026-11-01 to 2026-11-10
- **THEN** its status is «Запланирована»

#### Scenario: campaign on its first and last day
- **WHEN** today equals the start date, or today equals the end date
- **THEN** the status is «Активна»

#### Scenario: campaign after the end
- **WHEN** today is 2026-11-11 and a campaign ends 2026-11-10
- **THEN** its status is «Завершена»

### Requirement: Allowed status transitions
Campaign status SHALL move only forward with the date: «Запланирована» → «Активна» → «Завершена». No function sets a campaign status. Screen status SHALL be «онлайн» (`online`) or «офлайн» (`offline`), set only by the seed; no public function changes it.

#### Scenario: no status argument
- **WHEN** a client sends a status field to any public function
- **THEN** the argument validator rejects the call

#### Scenario: status follows the date
- **WHEN** the same campaign is read on its start date minus 1, on its start date and on its end date plus 1
- **THEN** the statuses are «Запланирована», «Активна» and «Завершена»

### Requirement: Notifications rule
Notifications SHALL be computed, not stored: «Экран недоступен» plus the screen name for each screen with status «офлайн», and «Кампания скоро завершится» plus the campaign name for each campaign whose end date is 0 to 3 days after today (D-5).

#### Scenario: offline screen notification
- **WHEN** screen «AST-001» has status `offline`
- **THEN** the notifications include «Экран недоступен» with that screen name

#### Scenario: campaign ends in 3 days
- **WHEN** today is 2026-10-31 and a campaign ends 2026-11-03
- **THEN** the notifications include «Кампания скоро завершится» with that campaign name

#### Scenario: campaign ends in 4 days or ended
- **WHEN** today is 2026-10-31 and a campaign ends 2026-11-04, or ended 2026-10-30
- **THEN** the notifications do not include it
