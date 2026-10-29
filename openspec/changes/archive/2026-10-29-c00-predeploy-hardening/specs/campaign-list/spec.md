## MODIFIED Requirements

### Requirement: Row fields
Each row SHALL show: name, advertiser, period (start and end date, inclusive), cities (labels from `cities`), number of screens, status, planned shows («Запланированные показы») and shows by the log («Показы по журналу»). The status SHALL show as a badge with its status text. Planned shows SHALL be the planned shows of the whole campaign period on all its screens (rule `slot-model`).

#### Scenario: row shows all campaign fields
- **WHEN** the admin opens «Рекламные кампании»
- **THEN** the «Летняя акция» row shows «Demo Cola», its start and end dates, «Астана» and «Караганда», its screen count, «Активна», its planned shows and its shows by the log
- **AND** its planned shows equal the planned shows of the campaign over its whole period and screens

#### Scenario: row name opens the card
- **WHEN** the admin clicks a campaign name in the list
- **THEN** the app opens `/campaigns/<id>` of that campaign

#### Scenario: status shows as a badge
- **WHEN** the admin opens «Рекламные кампании» right after «Сбросить демо»
- **THEN** the status of each row is a badge, for example «Запланирована» on the «Презентация автомобиля» row

### Requirement: Log values come only from the show log
Shows by the log SHALL be the sum of the campaign's show log rows. A campaign without rows SHALL show 0 (spec `show-log`). The 0 SHALL read as «no simulated log yet», not as a failure: it SHALL be dimmed and carry the hint «Журнал не смоделирован», visible on hover and focus and readable by a screen reader.

#### Scenario: log shows are the sum of the show log
- **WHEN** «Летняя акция» has seeded show log rows
- **THEN** its shows by the log equal the sum of those rows
- **AND** they are greater than 0 and not greater than its planned shows

#### Scenario: campaign without log shows zero
- **WHEN** «Презентация автомобиля» has no show log rows
- **THEN** its row shows 0 shows by the log

#### Scenario: zero log carries the not simulated hint
- **WHEN** a campaign has no show log rows
- **THEN** its shows by the log cell shows 0 with the hint «Журнал не смоделирован»
- **AND** a campaign with shows by the log greater than 0 shows no such hint
