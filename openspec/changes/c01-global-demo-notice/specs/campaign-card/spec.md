## MODIFIED Requirements

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
