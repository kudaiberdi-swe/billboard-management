## MODIFIED Requirements

### Requirement: Conflict blocks the save
When free slots are not enough, `campaigns.create` SHALL fail with `SLOT_CONFLICT` and `conflicts` (screen, date, hour, free, requested) and SHALL write nothing. The form SHALL show the conflict once, in the preview panel, never as a second message under the form. The panel SHALL show the title «Недостаточно свободных слотов» and 1 line per screen in conflict, ordered by screen code: «{screen} — {dates}, {hours}». Here `{screen}` is the screen code and name (the code once), `{dates}` is the date span in DD.MM.YYYY (one date when the span is one day), and `{hours}` lists the merged hour ranges. When the check counted more conflicts than it returned, the list SHALL end with «и другие». The conflict comes from the live check (`campaigns.checkAvailability`), or from a save the server refused, for as long as the inputs are the ones of that save. While a conflict shows, «Сохранить» SHALL be disabled, with the hint «Уменьшите число слотов или измените даты».

#### Scenario: conflict blocks the save
- **WHEN** a signed-in visitor saves a campaign whose request does not fit on 1 screen hour
- **THEN** `campaigns.create` fails with `SLOT_CONFLICT` and a non-empty `conflicts` list
- **AND** the number of campaigns is unchanged and the form stays open with the entered values

#### Scenario: conflict message names screens and hours
- **WHEN** the conflicts are screen AST-001 at 10:00 and 11:00 on 2026-11-03 to 2026-11-05
- **THEN** the preview panel shows the title «Недостаточно свободных слотов»
- **AND** one line «{screen} — 03.11.2026–05.11.2026, 10:00–12:00», where `{screen}` is the AST-001 code and name

#### Scenario: save is off during a conflict
- **WHEN** the live check of the form returns at least 1 conflict
- **THEN** «Сохранить» is disabled
- **AND** the form shows the hint «Уменьшите число слотов или измените даты»
- **AND** no text «Недостаточно свободных слотов. Конфликт: …» shows under the form

#### Scenario: refused save shows in the panel
- **WHEN** the preview showed no conflict, another campaign then took the last free slots, and the visitor clicks «Сохранить»
- **THEN** the preview panel shows «Недостаточно свободных слотов» with the line of that screen
- **AND** «Сохранить» is disabled until the visitor changes the dates, screens, hours or slots
