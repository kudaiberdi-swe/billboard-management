# campaign-card Specification

## Purpose
The campaign card page `/campaigns/:id` shows one campaign in detail, per screen plan and log values, and hosts the «Смоделировать показы» action of F-10 (orchestrator decision G-1).

## Requirements

### Requirement: Card content
The card SHALL show: name, advertiser, period, show hours, slots per 1-minute cycle, creative (placeholder image or uploaded video), status from the dates, cities, planned shows, shows by the log, and a table of the campaign screens. Each table row SHALL show the screen code and name (the code once), city, «онлайн» / «офлайн», planned shows and shows by the log. The card values SHALL carry no «Демонстрационные данные» label of their own; the app-shell global notice «Все показатели — демонстрационные данные» marks them.

#### Scenario: card shows campaign details
- **WHEN** the admin opens the card of «Летняя акция»
- **THEN** it shows «Летняя акция», «Demo Cola», the period, the show hours 08:00–22:00, 2 slots per cycle, the creative, «Активна», the cities and the screens table
- **AND** no value, header or table column shows a «Демонстрационные данные» label
- **AND** the page shows the global notice «Все показатели — демонстрационные данные»

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

### Requirement: Unknown campaign
`campaigns.get` SHALL fail with `NOT_FOUND` (`entity: "campaign"`) when the id is malformed or the campaign no longer exists (for example after «Сбросить демо»). The card SHALL then show the `errors.NOT_FOUND` text and a link back to «Рекламные кампании».

#### Scenario: card of a deleted campaign
- **WHEN** the admin opens `/campaigns/<id>` of a campaign removed by «Сбросить демо»
- **THEN** `campaigns.get` fails with `NOT_FOUND`
- **AND** the page shows «Запись не найдена. Возможно, демо было сброшено.» and «К списку кампаний»

#### Scenario: card with a malformed id
- **WHEN** `campaigns.get` is called with `campaignId` "abc"
- **THEN** it fails with `NOT_FOUND`

### Requirement: Card needs a demo session
`campaigns.get` SHALL refuse a call without a valid demo session with `UNAUTHENTICATED`, before it reads the campaign.

#### Scenario: card without session is refused
- **WHEN** `campaigns.get` is called with an unknown session id and a valid campaign id
- **THEN** it fails with `UNAUTHENTICATED`
- **AND** no campaign data is returned

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
