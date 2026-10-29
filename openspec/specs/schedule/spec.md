# schedule Specification

## Purpose
Shows which ad runs on one screen and when on one day: the working hours and, for each hour, the 1-minute cycle of 12 five-second slots with the campaign in each slot or «Свободно».

## Requirements

### Requirement: Select city, billboard and date
«Расписание» SHALL let R-1 select a city, a billboard and a date. The city SHALL narrow the billboard choices to the screens of that city. The date SHALL start at today in Kazakhstan time (UTC+5) (team default). The selection SHALL live in the URL search params, so a page refresh keeps it. Until a billboard is selected, the section SHALL show a hint to select one and no hours.

#### Scenario: user selects city billboard and date
- **WHEN** R-1 selects city «Астана», billboard «AST-001 …» and date 2026-10-30
- **THEN** the section shows the schedule of that screen for 2026-10-30
- **AND** after a page refresh the same city, billboard and date stay selected

#### Scenario: city narrows the billboard picker
- **WHEN** R-1 selects city «Атырау»
- **THEN** the billboard picker offers only screens of «Атырау»

#### Scenario: date defaults to today
- **WHEN** R-1 opens «Расписание» without a date in the URL
- **THEN** the date picker shows today in UTC+5

#### Scenario: no billboard selected
- **WHEN** R-1 opens «Расписание» without a billboard selected
- **THEN** the section shows the select-billboard hint and no hours

### Requirement: Hours of the day
For the selected screen and date, the schedule SHALL list each working hour of the screen in order, with its time range and the count of occupied slots out of 12. Hours outside the screen working hours SHALL not be listed.

#### Scenario: schedule lists the working hours
- **WHEN** R-1 selects a screen that works 07:00–23:00
- **THEN** the schedule lists 16 hours from 07:00–08:00 to 22:00–23:00, each with its occupied slot count of 12

#### Scenario: round-the-clock screen lists 24 hours
- **WHEN** R-1 selects a screen that works 0–24
- **THEN** the schedule lists 24 hours from 00:00–01:00 to 23:00–24:00

### Requirement: 1-minute cycle of an hour
Opening an hour SHALL show its 1-minute cycle of 12 slots in order. Each slot SHALL show its time inside the cycle, «00–05 сек.» for slot 1 up to «55–60 сек.» for slot 12, and the campaign name or «Свободно». Slots SHALL be filled by the shared slot packing: campaigns on that screen, date and hour, in creation order, from slot 1.

#### Scenario: opening an hour shows 12 slots
- **WHEN** R-1 opens the hour 10:00–11:00
- **THEN** 12 slots show in order, the first «00–05 сек.» and the last «55–60 сек.»

#### Scenario: slots show time and campaign or Свободно
- **WHEN** in the opened hour campaign «Летняя акция» has 2 slots per cycle and no other campaign runs
- **THEN** slots «00–05 сек.» and «05–10 сек.» show «Летняя акция»
- **AND** slots «10–15 сек.» to «55–60 сек.» show «Свободно»

#### Scenario: campaign outside its dates is not shown
- **WHEN** R-1 selects a date before the start date of a campaign on that screen
- **THEN** no slot of that date shows that campaign

### Requirement: Occupied and free slots differ
Occupied and free slots SHALL look different by more than color: an occupied slot shows the campaign name as a link on a filled background, a free slot shows «Свободно» on an outlined background.

#### Scenario: occupied and free slots look different
- **WHEN** an opened hour has occupied and free slots
- **THEN** each occupied slot is marked occupied and shows a campaign link, each free slot is marked free and shows «Свободно», and the two use different styles

### Requirement: Link to the campaign card
Each campaign name in a slot or an hour summary SHALL be a link to the campaign card at `/campaigns/<campaign id>`.

#### Scenario: campaign name links to the campaign card
- **WHEN** R-1 clicks a campaign name in a slot
- **THEN** the app navigates to `/campaigns/<that campaign id>`

### Requirement: Each hour has its own slot set
When campaigns overlap only part of the hours, each hour SHALL show only the campaigns that run in that hour.

#### Scenario: partial hour overlap gives each hour its own slots
- **WHEN** on one screen and date campaign A (created first, 2 slots, 08:00–12:00) and campaign B (2 slots, 10:00–14:00) both run
- **THEN** hour 09:00–10:00 shows A in slots 1–2 and 10 slots «Свободно»
- **AND** hour 11:00–12:00 shows A in slots 1–2, B in slots 3–4 and 8 slots «Свободно»
- **AND** hour 13:00–14:00 shows B in slots 1–2 and 10 slots «Свободно»

### Requirement: Schedule access and input checks
The schedule data SHALL be returned only for a valid demo session, a valid date and an existing screen.

#### Scenario: schedule without a session is refused
- **WHEN** a caller requests the schedule with no valid demo session
- **THEN** the call fails with `UNAUTHENTICATED` and returns no slots

#### Scenario: invalid date is refused
- **WHEN** a caller requests the schedule with date "2026-13-45" or "tomorrow"
- **THEN** the call fails with `INVALID_INPUT` and field `date`

#### Scenario: unknown screen is refused
- **WHEN** a caller requests the schedule with a screen id that is malformed or no longer exists (for example after «Сбросить демо»)
- **THEN** the call fails with `NOT_FOUND` and entity `screens`
- **AND** the page shows «Запись не найдена. Возможно, демо было сброшено.» and the billboard picker stays usable

### Requirement: Campaign marked from its card
When the URL holds `campaign=<id>` (link «Показать в расписании» of the campaign card), the schedule SHALL mark that campaign: its slots get the filled style and the screen-reader note «Выделенная кампания», and its name in the hour summary is bold. The first hour that holds the campaign SHALL open by itself until the visitor opens or closes an hour. Without `campaign`, no slot is marked and no hour opens by itself.

#### Scenario: marked campaign opens its first hour
- **WHEN** R-1 opens `/schedule?screen=<id>&date=<day>&campaign=<id of «Летняя акция»>` for a screen and day where «Летняя акция» runs from 08:00
- **THEN** the hour 08:00–09:00 is open without a click
- **AND** the slots of «Летняя акция» in it are marked and carry «Выделенная кампания»
- **AND** the slots of other campaigns are not marked

#### Scenario: schedule without campaign marks nothing
- **WHEN** R-1 opens «Расписание» with a screen and date but without `campaign` in the URL
- **THEN** no hour is open and no slot is marked
