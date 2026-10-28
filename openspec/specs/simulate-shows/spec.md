# simulate-shows Specification

## Purpose
«Смоделировать показы» is the only way a viewer creates shows by the log: an explicit action on the campaign card that writes a simulated log for the past part of the campaign (SoW §4.10 F-10).

## Requirements

### Requirement: Button on the campaign card
The campaign card SHALL show the button «Смоделировать показы». While the action runs the button SHALL be disabled. After success the card SHALL show «Показы смоделированы: {from} – {to}» and the new shows by the log.

#### Scenario: card has the simulate button
- **WHEN** the admin opens the card of any campaign
- **THEN** the card shows the button «Смоделировать показы»

#### Scenario: button shows the result
- **WHEN** the admin clicks «Смоделировать показы» on the card of «Летняя акция»
- **THEN** the button is disabled until the action returns
- **AND** the card shows «Показы смоделированы: » with the simulated date range

### Requirement: Log only for the past part on online screens
The action SHALL replace the campaign's show log with rows produced by the `show-log` rule: only screens with status «онлайн», only days from the window start up to today (UTC+5), and for today only finished hours inside the show hours and working hours.

#### Scenario: no log after today
- **WHEN** today is 2026-10-31 at 10:00 and the admin simulates a campaign from 2026-10-25 to 2026-11-10 with show hours 08:00–20:00
- **THEN** log rows exist for 2026-10-25 to 2026-10-31 only
- **AND** the 2026-10-31 rows count hours 08 and 09 only

#### Scenario: today counts finished hours only
- **WHEN** today is 2026-10-31 at 08:00 and the campaign shows from 08:00
- **THEN** the rows of 2026-10-31 have 0 shows

#### Scenario: no log on offline screens
- **WHEN** the admin simulates a campaign that has a screen with status «офлайн»
- **THEN** no log row exists for that screen

#### Scenario: rerun replaces the log
- **WHEN** the admin runs «Смоделировать показы» twice on the same day for the same campaign
- **THEN** the campaign has the same rows as after the first run, not twice as many
- **AND** no rows of other campaigns change

### Requirement: Log never exceeds the plan
Each written row SHALL have shows ≤ the planned shows of that screen and day, so shows by the log never exceed planned shows.

#### Scenario: log never exceeds plan after simulate
- **WHEN** the admin simulates any seeded campaign that has started
- **THEN** every row has shows ≤ planned shows of that screen and day
- **AND** the campaign's shows by the log are ≤ its planned shows

### Requirement: Simulated period is capped
One run SHALL cover at most the last 31 days of the past part: from max(start date, last day − 30) to last day, where last day = min(end date, today). Older days get no rows. The result SHALL return the covered `from` and `to` dates.

#### Scenario: simulated period is capped at 31 days
- **WHEN** today is 2026-10-28 and the admin simulates a campaign from 2026-08-01 to 2026-12-31
- **THEN** log rows exist only for 2026-09-28 to 2026-10-28
- **AND** the result has `from` 2026-09-28 and `to` 2026-10-28

#### Scenario: finished campaign keeps its last 31 days
- **WHEN** today is 2026-10-28 and the admin simulates a campaign from 2026-07-01 to 2026-09-30
- **THEN** log rows exist only for 2026-08-31 to 2026-09-30

### Requirement: New log values reach the readers
After the action, every reader of shows by the log (campaign card, «Отчёты», «Главная») SHALL show the new values without a page refresh, because they read the same `showLog` rows.

#### Scenario: new log values reach the readers
- **WHEN** the admin simulates «Презентация автомобиля» after its start date
- **THEN** `campaigns.get` returns shows by the log equal to the sum of the written rows
- **AND** the written rows are found by date for «Главная» and by campaign for «Отчёты»

### Requirement: Refusals
The action SHALL refuse: a call without a valid demo session with `UNAUTHENTICATED`; a campaign id that no longer exists with `NOT_FOUND` (`entity: "campaign"`); a campaign whose start date is after today with `CAMPAIGN_NOT_STARTED`. A refused call SHALL write and delete nothing. The card SHALL show the `errors.<CODE>` text.

#### Scenario: not started campaign is refused
- **WHEN** the admin clicks «Смоделировать показы» on «Презентация автомобиля» while its status is «Запланирована»
- **THEN** the action fails with `CAMPAIGN_NOT_STARTED`
- **AND** the card shows «Кампания ещё не началась. Показы по журналу появятся после даты начала.»
- **AND** the campaign has 0 shows by the log

#### Scenario: deleted campaign is refused
- **WHEN** `showLog.simulate` is called with the id of a campaign removed by «Сбросить демо»
- **THEN** it fails with `NOT_FOUND`
- **AND** no show log row is written

#### Scenario: simulate without session is refused
- **WHEN** `showLog.simulate` is called with an unknown or expired session id
- **THEN** it fails with `UNAUTHENTICATED`
- **AND** no show log row is written or deleted
