## MODIFIED Requirements

### Requirement: Network value cards
«Главная» SHALL show 8 cards for the selected screens and period, in 2 rows of 4, with these labels: «Экраны в сети»; «Онлайн / офлайн» (one card with the count of screens «онлайн», then the count of screens «офлайн», as «{онлайн} / {офлайн}»); «Активные кампании»; «Занятость рекламного инвентаря» (a percent with 1 decimal); «Запланированные показы»; «Показы по журналу»; «Оценочные контакты с кампанией»; «Взгляды на экран» (demo value). Screen counts SHALL use the current screen status. Active campaigns SHALL count campaigns with status «Активна» today that use a selected screen and overlap the period.

#### Scenario: cards show the network values
- **WHEN** R-1 opens «Главная» on the seed data with no city and no billboard filter
- **THEN** exactly 8 cards show, labelled «Экраны в сети», «Онлайн / офлайн», «Активные кампании», «Занятость рекламного инвентаря», «Запланированные показы», «Показы по журналу», «Оценочные контакты с кампанией», «Взгляды на экран»
- **AND** the «Экраны в сети» card shows 100, and the 2 counts of the «Онлайн / офлайн» card sum to 100, with the second equal to the seed screens with status «офлайн»
- **AND** the active campaigns card shows the count of campaigns with status «Активна» today, including «Летняя акция» and «Открытие магазина»
- **AND** the occupancy, planned shows, shows by the log, contacts and screen looks cards each show a number

#### Scenario: screen looks card sums looks
- **WHEN** R-1 opens «Главная» for a period and a set of screens
- **THEN** the screen looks card equals the sum of the daily looks of the selected screens with a camera over the period
- **AND** screens without a camera add 0

#### Scenario: no session is refused
- **WHEN** a caller without a valid demo session asks for the dashboard values
- **THEN** the request fails with `UNAUTHENTICATED` and no values are returned

### Requirement: In-app notifications
«Главная» SHALL show an in-app list for R-1 that covers the whole network and does not depend on the filters. Screens with status «офлайн» SHALL form one group: the title «Экран недоступен» with their count, each screen name as a link to its card `/billboards/<id>`, and the link «Все недоступные экраны» to `/billboards?status=offline`. After the group, the list SHALL show «Кампания скоро завершится» for every campaign whose end date is 0 to 3 days after today (D-5), by end date, with the campaign name as a link to `/campaigns/<id>`.

#### Scenario: offline screen notification
- **WHEN** a screen has status «офлайн» and R-1 opens «Главная»
- **THEN** the in-app list on «Главная» shows «Экран недоступен» with that screen name

#### Scenario: offline screens form one linked group
- **WHEN** 2 screens have status «офлайн» and R-1 opens «Главная»
- **THEN** the list shows «Экран недоступен» once, with the count 2 and both screen names
- **AND** each name links to `/billboards/<id>` of its screen, and «Все недоступные экраны» links to `/billboards?status=offline`

#### Scenario: ending campaign notification
- **WHEN** a campaign ends 3 days after today or sooner and has not ended yet, and R-1 opens «Главная»
- **THEN** the in-app list on «Главная» shows «Кампания скоро завершится» with that campaign name

#### Scenario: ending campaign links to its card
- **WHEN** the list shows «Кампания скоро завершится» for a campaign and R-1 clicks its name
- **THEN** the app opens `/campaigns/<id>` of that campaign

#### Scenario: campaign ending later has no notification
- **WHEN** a campaign ends 4 days after today
- **THEN** the in-app list does not show it

#### Scenario: notifications need a session
- **WHEN** a caller without a valid demo session asks for the notifications
- **THEN** the request fails with `UNAUTHENTICATED`
