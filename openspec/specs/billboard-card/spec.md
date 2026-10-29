# billboard-card Specification

## Purpose
Shows one screen of the network in detail: where it is, whether it works, how full it is, which campaigns run on it and when, its demo audience and its recent events.

## Requirements

### Requirement: Card content
The billboard card at `/billboards/<screen id>` SHALL show: the screen image; name and code; city, address and coordinates; status «онлайн» or «офлайн»; working hours; current occupancy, % (today's D-3 value, team default); the assigned campaigns; today's schedule; the demo audience of the last 7 days; recent events.

#### Scenario: card shows every required block
- **WHEN** R-1 opens the card of a seeded online screen with a camera
- **THEN** the card shows the image, name and code, city and address, status «онлайн», working hours, today's occupancy %, the assigned campaigns, today's schedule, the audience block and the events block

#### Scenario: round-the-clock screen
- **WHEN** R-1 opens the card of a screen that works 0–24
- **THEN** the working hours read as round-the-clock and the schedule lists 24 hours

#### Scenario: card without a session is refused
- **WHEN** a caller requests a card with no valid demo session
- **THEN** the call fails with `UNAUTHENTICATED` and returns no screen data

#### Scenario: unknown screen id
- **WHEN** R-1 opens `/billboards/<id>` with an id that is malformed or no longer exists (for example after «Сбросить демо»)
- **THEN** the call fails with `NOT_FOUND` and entity `screens`
- **AND** the page shows «Запись не найдена. Возможно, демо было сброшено.» and a link back to «Билборды»

### Requirement: Assigned campaigns
The card SHALL list every campaign whose screens include this screen, with name, advertiser, period, show hours, slots per cycle and the status computed from the dates («Запланирована», «Активна», «Завершена»), ordered by start date.

#### Scenario: card lists assigned campaigns with status
- **WHEN** a screen is in one «Активна», one «Запланирована» and one «Завершена» campaign
- **THEN** the card lists the 3 campaigns with those statuses
- **AND** a campaign that does not include this screen is not listed

### Requirement: Today's schedule on the card
The card SHALL show a compact read-only list of today's working hours (UTC+5). Each hour SHALL show its time range, the occupied slots out of 12 and the names of the campaigns in its slots, or «Свободно» when no slot is taken. Values SHALL come from the shared slot packing, the same rule «Расписание» uses (team default for G-3: today).

#### Scenario: card campaigns match the schedule slots
- **WHEN** R-1 opens the card of a screen that has campaigns today
- **THEN** for each working hour, the campaign names and the occupied slot count equal the occupied slots of the shared slot packing for that screen, today and hour
- **AND** each campaign that occupies a slot today is in the assigned campaigns list with status «Активна»

#### Scenario: free hour shows Свободно
- **WHEN** an hour of today has no campaign on the screen
- **THEN** that hour shows 0 of 12 and «Свободно»

#### Scenario: hours outside working hours are not listed
- **WHEN** a screen works 07:00–23:00
- **THEN** today's schedule lists exactly the hours 07:00–08:00 to 22:00–23:00

### Requirement: Demo audience on the card
The card SHALL show the sum over the last 7 days of estimated people in view, screen looks and, only for screens with the vehicle metric, vehicles, from the shared audience generator. The audience block SHALL carry no label of its own; the app-shell global notice «Все показатели — демонстрационные данные» marks it. A screen without a camera SHALL show «нет камеры».

#### Scenario: card shows the demo audience
- **WHEN** R-1 opens the card of a screen with a camera and the vehicle metric
- **THEN** the audience block shows people in view, looks and vehicles for the 7 days and no «Демонстрационные данные» label
- **AND** the page shows the global notice «Все показатели — демонстрационные данные»

#### Scenario: card of a screen without a camera
- **WHEN** R-1 opens the card of a screen without a camera
- **THEN** the audience block shows «нет камеры» and no numbers

#### Scenario: card of a screen without the vehicle metric
- **WHEN** R-1 opens the card of a screen with a camera and without the vehicle metric
- **THEN** the audience block shows people in view and looks and no vehicles value

### Requirement: Recent events
The card SHALL list the latest 10 events of the screen, newest first, with date and time in UTC+5 and the label «Экран недоступен» or «Экран снова онлайн». A screen with no events SHALL show the empty-events text.

#### Scenario: card shows recent screen events
- **WHEN** R-1 opens the card of a seeded «офлайн» screen
- **THEN** the events block lists «Экран недоступен» with its date and time

#### Scenario: screen without events
- **WHEN** R-1 opens the card of a screen that has no events
- **THEN** the events block shows the empty-events text
