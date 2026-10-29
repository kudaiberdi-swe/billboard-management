## ADDED Requirements

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
