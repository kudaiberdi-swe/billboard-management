# Spec Delta

## Purpose

The «Рекламные кампании» section lists every campaign of the demo network with its advertiser, period, cities, screens, status from the dates, planned shows and shows by the demo log (SoW §4.5 F-5).

## ADDED Requirements

### Requirement: List shows every campaign
The «Рекламные кампании» section SHALL list every stored campaign, seeded or created by a viewer, newest first (by creation time). After «Сбросить демо» the list SHALL hold exactly the seed campaigns.

#### Scenario: seed has the three named campaigns
- **WHEN** the admin opens «Рекламные кампании» right after «Сбросить демо»
- **THEN** the list has «Летняя акция» / «Demo Cola» / «Активна»
- **AND** «Открытие магазина» / «Demo Market» / «Активна»
- **AND** «Презентация автомобиля» / «Demo Auto» / «Запланирована»
- **AND** the list has at least 10 campaigns

#### Scenario: newest campaign comes first
- **WHEN** a campaign is created after the seed
- **THEN** it is the first row of the list

#### Scenario: empty list shows a message
- **WHEN** the list query returns no campaigns
- **THEN** the section shows «Кампаний пока нет»

### Requirement: Row fields
Each row SHALL show: name, advertiser, period (start and end date, inclusive), cities (labels from `cities`), number of screens, status, planned shows («Запланированные показы») and shows by the log («Показы по журналу»). Planned shows SHALL be the planned shows of the whole campaign period on all its screens (rule `slot-model`).

#### Scenario: row shows all campaign fields
- **WHEN** the admin opens «Рекламные кампании»
- **THEN** the «Летняя акция» row shows «Demo Cola», its start and end dates, «Астана» and «Караганда», its screen count, «Активна», its planned shows and its shows by the log
- **AND** its planned shows equal the planned shows of the campaign over its whole period and screens

#### Scenario: row name opens the card
- **WHEN** the admin clicks a campaign name in the list
- **THEN** the app opens `/campaigns/<id>` of that campaign

### Requirement: Log values come only from the show log
Shows by the log SHALL be the sum of the campaign's show log rows. A campaign without rows SHALL show 0 (spec `show-log`).

#### Scenario: log shows are the sum of the show log
- **WHEN** «Летняя акция» has seeded show log rows
- **THEN** its shows by the log equal the sum of those rows
- **AND** they are greater than 0 and not greater than its planned shows

#### Scenario: campaign without log shows zero
- **WHEN** «Презентация автомобиля» has no show log rows
- **THEN** its row shows 0 shows by the log

### Requirement: Status from the dates
The status SHALL be computed from the dates on each read with today in UTC+5 (spec `statuses`): before the start «Запланирована», from the start to the end date inclusive «Активна», after the end «Завершена». No status is stored or accepted from the client.

#### Scenario: status before the start date
- **WHEN** today is 2026-10-28 and a campaign starts on 2026-10-29
- **THEN** its status is «Запланирована»

#### Scenario: status between start and end
- **WHEN** today is 2026-10-28 and a campaign runs from 2026-10-28 to 2026-10-28
- **THEN** its status is «Активна»

#### Scenario: status after the end date
- **WHEN** today is 2026-10-28 and a campaign ended on 2026-10-27
- **THEN** its status is «Завершена»

### Requirement: No real brands in the seed
Seed campaigns SHALL use synthetic advertiser names that start with «Demo »; no real brand name appears in seed campaign data.

#### Scenario: seed has no real brand names
- **WHEN** the list is read right after «Сбросить демо»
- **THEN** every advertiser starts with «Demo »

### Requirement: Demo label on log values
The section SHALL show «Демонстрационные данные» because shows by the log are simulated.

#### Scenario: list carries the demo label
- **WHEN** the admin opens «Рекламные кампании»
- **THEN** the page shows «Демонстрационные данные»

### Requirement: List needs a demo session
`campaigns.list` SHALL refuse a call without a valid demo session with `UNAUTHENTICATED`.

#### Scenario: list without session is refused
- **WHEN** `campaigns.list` is called with an unknown or expired session id
- **THEN** it fails with `UNAUTHENTICATED`
- **AND** no campaign data is returned
