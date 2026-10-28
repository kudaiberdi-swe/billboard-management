# dashboard Specification

## Purpose
The «Главная» section: the state of the screen network and the key values for a selected period, with filters, an occupancy chart, screens per city, active campaigns and the in-app notifications list.

## Requirements

### Requirement: Network value cards
«Главная» SHALL show 8 cards for the selected screens and period: screens in the network; screens «онлайн» and «офлайн»; active campaigns; inventory occupancy, %; planned shows; shows by the demo log; estimated audience contacts; screen looks (demo value). Screen counts SHALL use the current screen status. Active campaigns SHALL count campaigns with status «Активна» today that use a selected screen and overlap the period.

#### Scenario: cards show the network values
- **WHEN** R-1 opens «Главная» on the seed data with no city and no billboard filter
- **THEN** the screens card shows 100, the «онлайн» and «офлайн» cards sum to 100 and the «офлайн» count equals the seed screens with status «офлайн»
- **AND** the active campaigns card shows the count of campaigns with status «Активна» today, including «Летняя акция» and «Открытие магазина»
- **AND** the occupancy, planned shows, shows by the log, contacts and screen looks cards each show a number

#### Scenario: screen looks card sums looks
- **WHEN** R-1 opens «Главная» for a period and a set of screens
- **THEN** the screen looks card equals the sum of the daily looks of the selected screens with a camera over the period
- **AND** screens without a camera add 0

#### Scenario: no session is refused
- **WHEN** a caller without a valid demo session asks for the dashboard values
- **THEN** the request fails with `UNAUTHENTICATED` and no values are returned

### Requirement: Planned and log shows are separate
Planned shows and shows by the demo log SHALL be 2 separate cards. Planned shows SHALL be the sum of planned shows of all campaigns on the selected screens in the period (period clipped to each campaign). Shows by the log SHALL be the sum of show log rows of the selected screens with a date in the period.

#### Scenario: planned and log shows are separate cards
- **WHEN** R-1 opens «Главная» for a period that holds show log rows of «Летняя акция»
- **THEN** one card shows the planned shows and another card shows the shows by the log
- **AND** the shows by the log are not greater than the planned shows

#### Scenario: log shows update after simulation
- **WHEN** «Смоделировать показы» writes new show log rows for a campaign inside the selected period
- **THEN** the shows by the log card shows the new sum without a page refresh

### Requirement: Occupancy by D-3
The occupancy card SHALL show occupied slots / all slots in the working hours of the selected screens for the period × 100, with one decimal, and 0 when there are no slots (D-3).

#### Scenario: occupancy percent follows D-3
- **WHEN** one screen works 07:00–23:00, the period is one day, and one campaign holds 3 slots per cycle from 08:00 to 20:00 on it
- **THEN** the occupancy card shows 18.8 (36 of 192 slots)

#### Scenario: empty selection shows zero
- **WHEN** R-1 selects a city and a billboard of another city
- **THEN** every count card shows 0 and the occupancy card shows 0

### Requirement: Estimated contacts card
The contacts card SHALL show the sum of the D-4 estimate (capability `campaign-contacts`) of every campaign on the selected screens in the period. The card SHALL carry the demo label «Демонстрационные данные» (D-4).

#### Scenario: contacts follow D-4
- **WHEN** R-1 opens «Главная» for a period and a set of screens
- **THEN** the contacts card equals the sum of the D-4 estimate of each campaign for those screens and that period

#### Scenario: simulated cards carry the demo label
- **WHEN** R-1 opens «Главная»
- **THEN** the cards for shows by the log, estimated contacts and screen looks each show «Демонстрационные данные»

### Requirement: Chart, city block and campaign list
«Главная» SHALL show a chart of occupancy % per day of the period, a block with the count of selected screens per city, and a list of the active campaigns counted on the card with name, advertiser and end date.

#### Scenario: occupancy chart per day
- **WHEN** R-1 selects a period of 7 days
- **THEN** the chart shows 7 points, one per day, each with the D-3 occupancy of that day

#### Scenario: screens per city block
- **WHEN** R-1 opens «Главная» with no filter
- **THEN** the block shows the 4 regions «Астана», «Караганда», «Атырау», «Восточно-Казахстанская область» with screen counts that sum to 100

#### Scenario: active campaigns list
- **WHEN** R-1 opens «Главная» on the seed data
- **THEN** the list shows «Летняя акция» with «Demo Cola» and «Открытие магазина» with «Demo Market»
- **AND** it does not show «Презентация автомобиля» (status «Запланирована»)

### Requirement: Filters
The filters «период», «город», «билборд» SHALL change all cards, the chart, the city block and the campaign list. Filters SHALL live in the URL search params. The default period SHALL be the 7 days ending today (UTC+5).

#### Scenario: city filter changes all values
- **WHEN** R-1 sets «город» to «Астана»
- **THEN** every card, the chart, the city block and the campaign list use only the screens of «Астана»

#### Scenario: billboard filter changes all values
- **WHEN** R-1 sets «билборд» to one screen
- **THEN** the screens card shows 1 and every other value uses only that screen

#### Scenario: period filter changes all values
- **WHEN** R-1 changes «период» from 7 days to 1 day
- **THEN** occupancy, planned shows, shows by the log, contacts, screen looks, the chart and the campaign list are recomputed for that day

#### Scenario: invalid period is refused
- **WHEN** the dashboard values are asked with a start date after the end date, a date that is not "YYYY-MM-DD", or a period longer than 366 days
- **THEN** the request fails with `INVALID_INPUT` naming the field

#### Scenario: unknown billboard is refused
- **WHEN** the dashboard values are asked with a billboard id that no longer exists (for example after «Сбросить демо»)
- **THEN** the request fails with `NOT_FOUND` and the page shows the `errors.NOT_FOUND` text

### Requirement: In-app notifications
«Главная» SHALL show an in-app list for R-1: «Экран недоступен» + screen name for every screen with status «офлайн», then «Кампания скоро завершится» + campaign name for every campaign whose end date is 0 to 3 days after today (D-5), by end date. The list SHALL cover the whole network and not depend on the filters.

#### Scenario: offline screen notification
- **WHEN** a screen has status «офлайн» and R-1 opens «Главная»
- **THEN** the in-app list on «Главная» shows «Экран недоступен» with that screen name

#### Scenario: ending campaign notification
- **WHEN** a campaign ends 3 days after today or sooner and has not ended yet, and R-1 opens «Главная»
- **THEN** the in-app list on «Главная» shows «Кампания скоро завершится» with that campaign name

#### Scenario: campaign ending later has no notification
- **WHEN** a campaign ends 4 days after today
- **THEN** the in-app list does not show it

#### Scenario: notifications need a session
- **WHEN** a caller without a valid demo session asks for the notifications
- **THEN** the request fails with `UNAUTHENTICATED`
