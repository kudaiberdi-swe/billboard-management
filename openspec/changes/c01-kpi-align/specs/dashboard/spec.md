## MODIFIED Requirements

### Requirement: Network value cards
«Главная» SHALL show 8 cards for the selected screens and period, in 2 rows of 4, with these labels: «Экраны в сети»; «Онлайн / офлайн» (one card with the count of screens «онлайн», then the count of screens «офлайн», as «{онлайн} / {офлайн}»); «Активные кампании»; «Занятость рекламного инвентаря» (a percent with 1 decimal); «Запланированные показы»; «Показы по журналу»; «Оценочные контакты с кампанией»; «Взгляды на экран» (demo value). Screen counts SHALL use the current screen status. Active campaigns SHALL count campaigns with status «Активна» today that use a selected screen and overlap the period. Within one row, every card SHALL have the same height and its value SHALL sit at the bottom edge of the card, so the values of a row line up on one level whatever the label length. Labels SHALL wrap and show in full, never truncated.

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

#### Scenario: card values line up per row
- **WHEN** R-1 opens «Главная» at desktop width where the «Занятость рекламного инвентаря» label wraps to 2 lines and the «Экраны в сети» label fits 1 line
- **THEN** in each of the 2 rows, the bottom edges of the 4 card values are equal within 1px
- **AND** the 4 cards of a row have the same height
- **AND** every label shows its full text, with no ellipsis and no clipped line
