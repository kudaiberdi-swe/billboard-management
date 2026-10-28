# Spec Delta

## Purpose

Lets the network owner see all screens of the network in one list, narrow it with filters and search, and see the screens on a map that may fail without breaking the list.

## ADDED Requirements

### Requirement: Screen list
The «Билборды» section SHALL list every screen of the network sorted by code. Each row SHALL show: name and code; city and address; the screen image; status «онлайн» or «офлайн»; working hours; slot occupancy, %; the count of «Активна» campaigns on the screen; camera yes / no; the approximate audience for the period with the label «Демонстрационные данные».

#### Scenario: list shows the 100 seed screens in 4 regions
- **WHEN** R-1 opens «Билборды» with no filters after the seed
- **THEN** the list has 100 rows
- **AND** the cities are «Астана», «Караганда», «Атырау» and «Восточно-Казахстанская область», each with at least one row

#### Scenario: list row shows every required field
- **WHEN** R-1 opens «Билборды»
- **THEN** each row shows the name and code, the city and address, the image from `public/demo/screens/` by the screen image key, the status «онлайн» or «офлайн», the working hours, the occupancy %, the active campaigns count, the camera yes / no and the audience for the period
- **AND** the list shows «Демонстрационные данные»

#### Scenario: seed has offline screens
- **WHEN** R-1 opens «Билборды» after the seed
- **THEN** at least one row shows «офлайн» and at least one row shows «онлайн»

#### Scenario: list without a session is refused
- **WHEN** a caller requests the screen list with no valid demo session
- **THEN** the call fails with `UNAUTHENTICATED` and returns no rows

### Requirement: List period
Occupancy and audience on the list SHALL cover the last 7 days up to and including today in Kazakhstan time (UTC+5) (team default for G-3). Occupancy SHALL be the D-3 value for that screen and period (occupied slots / all slots in working hours × 100, one decimal). The active campaigns count SHALL count campaigns with status «Активна» today whose screens include that screen.

#### Scenario: occupancy uses the 7-day period
- **WHEN** a screen has one «Активна» campaign with 1 slot per cycle in all its working hours for all of the last 7 days and no other campaign
- **THEN** the row shows occupancy 8.3 % (1 of 12 slots)
- **AND** the active campaigns count is 1

#### Scenario: period is shown
- **WHEN** R-1 opens «Билборды» on 2026-10-28
- **THEN** the list states the period 2026-10-22 – 2026-10-28

#### Scenario: finished campaign is not counted as active
- **WHEN** a screen is in only one campaign and that campaign has status «Завершена»
- **THEN** the active campaigns count of that screen is 0

### Requirement: Audience on the list
The approximate audience SHALL be the sum of estimated people in view over the list period from the shared audience generator. A screen without a camera SHALL show «нет камеры» instead of a number.

#### Scenario: screen with a camera shows the period audience
- **WHEN** a screen has a camera
- **THEN** its row shows the sum of people in view of the 7 days from the audience generator

#### Scenario: screen without a camera shows нет камеры
- **WHEN** a screen has no camera
- **THEN** its row shows camera «нет» and audience «нет камеры»

### Requirement: Filters and search
The list SHALL filter by city, status, camera (yes / no), occupancy range (0–100 %, both ends inclusive) and a text search over name, code and address (case-insensitive substring, trimmed, empty = no filter). Filters SHALL combine with AND and live in the URL search params, so a page refresh keeps them.

#### Scenario: filter by city
- **WHEN** R-1 selects city «Караганда»
- **THEN** every row has city «Караганда» and every Karaganda screen is listed

#### Scenario: filter by status
- **WHEN** R-1 selects status «офлайн»
- **THEN** every row shows «офлайн» and the count equals the offline screens of the seed

#### Scenario: filter by camera
- **WHEN** R-1 selects camera «нет»
- **THEN** every row shows camera «нет» and audience «нет камеры»

#### Scenario: filter by occupancy range
- **WHEN** R-1 sets occupancy from 10 to 50 %
- **THEN** every row has occupancy ≥ 10 and ≤ 50

#### Scenario: search by name or address
- **WHEN** R-1 types part of one screen address in mixed case into search
- **THEN** that screen is listed and every listed row contains the text in its name, code or address

#### Scenario: filters combine and survive refresh
- **WHEN** R-1 selects city «Астана» and status «онлайн» and reloads the page
- **THEN** both filters are still set and every row is an online screen in «Астана»

#### Scenario: no screen matches
- **WHEN** R-1 searches for text that no screen has
- **THEN** the list shows the empty-state text and the map shows no markers

#### Scenario: invalid occupancy range is refused
- **WHEN** a caller requests the list with occupancy from 60 to 20, or a bound below 0 or above 100
- **THEN** the call fails with `INVALID_INPUT` and field `occupancy`

#### Scenario: too long search is refused
- **WHEN** a caller requests the list with a search text longer than 100 characters
- **THEN** the call fails with `INVALID_INPUT` and field `search`

### Requirement: Map of screens
The section SHALL show the listed screens on a Leaflet map with OpenStreetMap tiles and the visible attribution «© OpenStreetMap contributors» (D-7, ADR-0009). A marker click SHALL open the billboard card. The map SHALL load separately from the list: when the map script or tiles fail, the list, filters and search SHALL keep working and the map area SHALL show a short message.

#### Scenario: map shows a marker per listed screen
- **WHEN** R-1 opens «Билборды» with a city filter
- **THEN** the map shows one marker per listed screen at its coordinates and no other markers

#### Scenario: marker opens the card
- **WHEN** R-1 clicks a marker
- **THEN** the app opens `/billboards/<screen id>`

#### Scenario: list stays usable when the map fails
- **WHEN** the map component fails to load or throws
- **THEN** the map area shows the map-unavailable text
- **AND** the list, the filters and the search still work

### Requirement: Open a card from the list
Each list row SHALL link to the billboard card of its screen.

#### Scenario: row opens the card
- **WHEN** R-1 clicks a row name
- **THEN** the app opens `/billboards/<screen id>` and the menu item «Билборды» stays marked
