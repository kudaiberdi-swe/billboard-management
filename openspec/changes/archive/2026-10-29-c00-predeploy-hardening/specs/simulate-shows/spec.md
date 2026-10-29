## ADDED Requirements

### Requirement: Whole log stays within the row budget
All show log rows together SHALL stay at or under `LOG_ROW_BUDGET` = 20 000. The room left for a run is the budget minus the other campaigns' rows. A run needs 1 row per «онлайн» screen and day. When its window does not fit, it SHALL keep the latest days that fit and return that shorter `from`. When no day fits, it SHALL fail with `INVALID_INPUT` (`field: "campaignId"`) and write nothing. The card then shows «Журнал показов заполнен. Сбросьте демо, чтобы смоделировать показы снова.» (team copy).

#### Scenario: run keeps the latest days that fit
- **WHEN** today is 2026-10-28, the other campaigns hold 20 000 − 6 log rows, and the admin simulates a campaign from 2026-10-01 to 2026-10-31 on 2 «онлайн» screens
- **THEN** the result is `{ rows: 6, from: "2026-10-26", to: "2026-10-28" }`
- **AND** the show log holds exactly 20 000 rows

#### Scenario: rerun does not count its own rows
- **WHEN** the admin runs «Смоделировать показы» again on the same day for the campaign that filled the log to 20 000 rows
- **THEN** the result is the same as the first run
- **AND** the show log still holds 20 000 rows

#### Scenario: full log refuses the run
- **WHEN** the show log already holds 20 000 rows of other campaigns and the admin simulates a started campaign on 1 «онлайн» screen
- **THEN** `showLog.simulate` fails with `INVALID_INPUT` and `field` "campaignId"
- **AND** that campaign has no show log rows and no other row changed

#### Scenario: full log shows the log full message
- **WHEN** `showLog.simulate` fails with `INVALID_INPUT` and `field` "campaignId" after a click on «Смоделировать показы»
- **THEN** the card shows «Журнал показов заполнен. Сбросьте демо, чтобы смоделировать показы снова.»
- **AND** the card does not show «Проверьте поле: campaignId.»

## MODIFIED Requirements

### Requirement: New log values reach the readers
After the action, every reader of shows by the log (campaign card, «Отчёты», «Главная») SHALL show the new values without a page refresh, because they read the same `showLog` rows. All three read the rows by campaign; «Главная» keeps only the rows of the selected screens with a date in the period.

#### Scenario: new log values reach the readers
- **WHEN** the admin simulates «Презентация автомобиля» after its start date
- **THEN** `campaigns.get` returns shows by the log equal to the sum of the written rows
- **AND** the written rows are found by campaign for «Главная» and for «Отчёты»

### Requirement: Refusals
The action SHALL refuse: a call without a valid demo session with `UNAUTHENTICATED`; a campaign id that no longer exists with `NOT_FOUND` (`entity: "campaign"`); a campaign whose start date is after today with `CAMPAIGN_NOT_STARTED`; a run that does not fit the row budget with `INVALID_INPUT` (requirement «Whole log stays within the row budget»). A refused call SHALL write and delete nothing. The card SHALL show the `errors.<CODE>` text, except the row-budget refusal, which shows its own message. `CAMPAIGN_NOT_STARTED` is an expected state, not a failure: the card SHALL show its text as a neutral (grey) note and turn the button «Смоделировать показы» off.

#### Scenario: not started campaign is refused
- **WHEN** the admin clicks «Смоделировать показы» on «Презентация автомобиля» while its status is «Запланирована»
- **THEN** the action fails with `CAMPAIGN_NOT_STARTED`
- **AND** the card shows «Кампания ещё не началась. Показы по журналу появятся после даты начала.»
- **AND** the campaign has 0 shows by the log

#### Scenario: not started note turns the button off
- **WHEN** the card shows the `CAMPAIGN_NOT_STARTED` text after a click on «Смоделировать показы»
- **THEN** the note is grey, not red
- **AND** the button «Смоделировать показы» is disabled

#### Scenario: deleted campaign is refused
- **WHEN** `showLog.simulate` is called with the id of a campaign removed by «Сбросить демо»
- **THEN** it fails with `NOT_FOUND`
- **AND** no show log row is written

#### Scenario: simulate without session is refused
- **WHEN** `showLog.simulate` is called with an unknown or expired session id
- **THEN** it fails with `UNAUTHENTICATED`
- **AND** no show log row is written or deleted
