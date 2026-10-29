## ADDED Requirements

### Requirement: Link to the schedule
The card SHALL show the link «Показать в расписании» next to the screens table. It SHALL open `/schedule?screen=<first screen of the card>&date=<day>&campaign=<campaign id>`. `<day>` is today (UTC+5) when today lies inside the campaign period, else the campaign start date. «Расписание» then marks that campaign (spec `schedule`, «Campaign marked from its card»).

#### Scenario: show in schedule opens the marked schedule
- **WHEN** today is inside the period of «Летняя акция» and the admin clicks «Показать в расписании» on its card
- **THEN** the app opens `/schedule` with `screen` set to the first screen of the card, `date` set to today and `campaign` set to the id of «Летняя акция»

#### Scenario: show in schedule of a campaign outside today
- **WHEN** the admin clicks «Показать в расписании» on the card of «Презентация автомобиля» (status «Запланирована»)
- **THEN** the link opens `/schedule` with `date` set to the campaign start date

### Requirement: Zero log hint on the card
On the card, a shows-by-the-log value of 0 (the campaign total or a screen row) SHALL show the same hint «Журнал не смоделирован» as the campaigns list. The status SHALL show as a badge.

#### Scenario: card zero log carries the hint
- **WHEN** the admin opens the card of a campaign with no show log rows
- **THEN** its shows by the log and every screen row show 0 with the hint «Журнал не смоделирован»

## MODIFIED Requirements

### Requirement: Card content
The card SHALL show: name, advertiser, period, show hours, slots per 1-minute cycle, creative (placeholder image or uploaded video), status from the dates, cities, planned shows, shows by the log, and a table of the campaign screens. Each table row SHALL show the screen code and name (the code once), city, «онлайн» / «офлайн», planned shows and shows by the log. The card SHALL show «Демонстрационные данные».

#### Scenario: card shows campaign details
- **WHEN** the admin opens the card of «Летняя акция»
- **THEN** it shows «Летняя акция», «Demo Cola», the period, the show hours 08:00–22:00, 2 slots per cycle, the creative, «Активна», the cities and the screens table
- **AND** the page shows «Демонстрационные данные»

#### Scenario: per screen values add up to the totals
- **WHEN** the admin opens the card of a campaign with a show log
- **THEN** the per-screen planned shows sum to the card's planned shows
- **AND** the per-screen shows by the log sum to the card's shows by the log

#### Scenario: offline screen is marked on the card
- **WHEN** a campaign has a screen with status «офлайн»
- **THEN** the screens table shows «офлайн» for that screen

#### Scenario: screen row shows code and name
- **WHEN** the admin opens the card of a campaign on screen AST-001
- **THEN** its screen row shows the code «AST-001» and the screen name, with the code shown once
