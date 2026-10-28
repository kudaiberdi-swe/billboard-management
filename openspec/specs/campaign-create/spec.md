# campaign-create Specification

## Purpose
Lets the administrator (R-1) create an advertising campaign on 1 or more screens, with a preview of free slots and planned shows before saving and a server-side slot conflict check per screen, day and hour (SoW §4.6 F-6, D-1, D-8, D-9).

## Requirements

### Requirement: Campaign form fields
The «Рекламные кампании» section SHALL offer a form at `/campaigns/new` with: name, advertiser, start date, end date, 1 or more screens (from the screen picker), show hours (start hour and end hour), number of 5-second slots per 1-minute cycle, and creative. Saving SHALL store the campaign with exactly these values (name and advertiser trimmed).

#### Scenario: form shows all fields
- **WHEN** a signed-in visitor opens `/campaigns/new`
- **THEN** the form shows inputs for name, advertiser, start date, end date, screens, show start hour, show end hour, slots per cycle and creative
- **AND** the screen picker lists the screens of `screens.options` by code and name and allows more than 1 screen

#### Scenario: placeholder campaign is saved
- **WHEN** a signed-in visitor saves name «Demo Осенняя акция», advertiser «Demo Cola», dates from today to today + 6 days, 3 free screens, hours 08:00–20:00, 1 slot and the placeholder `placeholder-1`
- **THEN** `campaigns.create` returns the new campaign id
- **AND** the stored campaign has these values and creative `{ kind: "placeholder", key: "placeholder-1" }`

#### Scenario: form opens from the campaigns section
- **WHEN** a signed-in visitor clicks «Создать кампанию» in «Рекламные кампании»
- **THEN** the browser opens `/campaigns/new`
- **AND** the menu item «Рекламные кампании» stays marked as active

#### Scenario: empty name is rejected
- **WHEN** a signed-in visitor calls `campaigns.create` with a name of only spaces
- **THEN** the call fails with `INVALID_INPUT` and `field` "name"
- **AND** no campaign is written

### Requirement: Input validation
`campaigns.checkAvailability` and `campaigns.create` SHALL reject invalid input with `INVALID_INPUT` and the field name, before any conflict check: dates not "YYYY-MM-DD", end date before start date, period over 366 days, hours not integers in 0..23 / 1..24 with end after start, slots per cycle not an integer in 1..12, screens empty, repeated, over 100 or not existing.

#### Scenario: end date before start date
- **WHEN** a signed-in visitor calls `campaigns.checkAvailability` with start date 2026-11-10 and end date 2026-11-09
- **THEN** the call fails with `INVALID_INPUT` and `field` "endDate"

#### Scenario: period over 366 days
- **WHEN** a signed-in visitor calls `campaigns.create` with a period of 367 days
- **THEN** the call fails with `INVALID_INPUT` and `field` "endDate"

#### Scenario: show end hour not after start hour
- **WHEN** a signed-in visitor calls `campaigns.create` with show hours 20 to 8
- **THEN** the call fails with `INVALID_INPUT` and `field` "endHour"

#### Scenario: unknown or repeated screen
- **WHEN** a signed-in visitor calls `campaigns.create` with a screen id that no longer exists after «Сбросить демо», or with the same screen twice
- **THEN** the call fails with `INVALID_INPUT` and `field` "screenIds"

#### Scenario: field error names the form field
- **WHEN** the save fails with `INVALID_INPUT` and `field` "endDate"
- **THEN** the form shows «Проверьте поле: {field}.» with the label of the end date field in place of `{field}`

### Requirement: Cycle setting in the form
The slots-per-cycle choice SHALL offer the integers 1 to `SLOTS_PER_CYCLE` (12) and describe the slot length and cycle length from the cycle setting (5 s, 60 s), never from literal numbers in the form (D-1).

#### Scenario: slot choice follows the cycle setting
- **WHEN** a signed-in visitor opens the slots-per-cycle input
- **THEN** it offers 1 to 12
- **AND** its hint reads that one slot is 5 seconds of a 60-second cycle

#### Scenario: too many slots per cycle
- **WHEN** a signed-in visitor calls `campaigns.create` with 13 slots per cycle
- **THEN** the call fails with `INVALID_INPUT` and `field` "slotsPerCycle"

### Requirement: Creative choice
The form SHALL let the visitor pick 1 of the ready placeholders `placeholder-1` to `placeholder-4`, shown as their images, or upload a video. `campaigns.create` SHALL reject a placeholder key outside these 4 with `INVALID_CREATIVE`.

#### Scenario: form offers the placeholders
- **WHEN** a signed-in visitor opens the creative input
- **THEN** it shows the 4 placeholder images and a video upload option
- **AND** `placeholder-1` is selected by default

#### Scenario: unknown placeholder is rejected
- **WHEN** a signed-in visitor calls `campaigns.create` with creative `{ kind: "placeholder", key: "placeholder-9" }`
- **THEN** the call fails with `INVALID_CREATIVE`
- **AND** no campaign is written

### Requirement: Video creative
A video creative SHALL be 5 seconds long, of type `video/mp4` or `video/webm` and at most 20 MiB. The browser SHALL check duration (4.5–5.5 s), type and size before the upload. `campaigns.create` SHALL check the stored file's type and size and that no other campaign uses it, else fail with `INVALID_CREATIVE`. The server does not check duration.

#### Scenario: video campaign is saved
- **WHEN** a signed-in visitor uploads a 5-second `video/mp4` file of 1 MiB and saves the form with valid other fields
- **THEN** `campaigns.create` stores creative `{ kind: "video", storageId }` with the uploaded file id

#### Scenario: video of another length is blocked in the browser
- **WHEN** a signed-in visitor picks an 8-second video file
- **THEN** the form shows «Загрузите видео MP4 или WebM длительностью 5 секунд, до 20 МБ.»
- **AND** no upload URL is requested and nothing is uploaded

#### Scenario: video of a wrong type is rejected
- **WHEN** a signed-in visitor calls `campaigns.create` with a stored file of type `image/png`
- **THEN** the call fails with `INVALID_CREATIVE`

#### Scenario: video over 20 MB is rejected
- **WHEN** a signed-in visitor calls `campaigns.create` with a stored `video/mp4` file of 20 MiB + 1 byte
- **THEN** the call fails with `INVALID_CREATIVE`

#### Scenario: missing video file is rejected
- **WHEN** a signed-in visitor calls `campaigns.create` with a `storageId` whose file was deleted
- **THEN** the call fails with `INVALID_CREATIVE`

#### Scenario: video already used by another campaign
- **WHEN** a signed-in visitor calls `campaigns.create` with the `storageId` of a video that an existing campaign uses
- **THEN** the call fails with `INVALID_CREATIVE`

### Requirement: Video upload URL
`campaigns.generateUploadUrl` SHALL return a one-time upload URL to a valid demo session only, and SHALL consume the reserved `upload` rate limit keyed by the session id (5 calls in a burst, then `RateLimited`).

#### Scenario: upload URL for a valid session
- **WHEN** a signed-in visitor calls `campaigns.generateUploadUrl`
- **THEN** it returns an upload URL string

#### Scenario: sixth upload URL in a burst
- **WHEN** a signed-in visitor calls `campaigns.generateUploadUrl` 6 times in a row
- **THEN** the first 5 calls return a URL and the 6th fails with `RateLimited`
- **AND** the form shows «Слишком много попыток. Повторите через {minutes} мин.» with the minutes filled in

### Requirement: Availability and planned shows preview
Before save the form SHALL show availability and planned shows from `campaigns.checkAvailability`, updated when the inputs change. Planned shows per screen per day SHALL be slots per cycle × 60 × show hours inside that screen's working hours; the form SHALL show them per screen per day, for all screens per day, and for the whole period.

#### Scenario: planned shows example from the SoW
- **WHEN** a signed-in visitor checks 1 slot, hours 08:00–20:00, on 3 free screens with working hours 07:00–23:00
- **THEN** each screen has 720 planned shows per day
- **AND** the total per day is 2 160

#### Scenario: preview clipped to working hours
- **WHEN** a signed-in visitor checks 2 slots, hours 06:00–24:00, on 1 free screen with working hours 07:00–23:00, for 3 days
- **THEN** the screen has 1 920 planned shows per day and 5 760 for the period

#### Scenario: preview is shown before save
- **WHEN** a signed-in visitor fills dates, screens, hours and slots with valid values
- **THEN** the form shows «Свободных слотов достаточно» or the conflict message, and the planned shows per screen per day, per day and for the period
- **AND** nothing is saved until the visitor clicks «Сохранить»

### Requirement: Slot conflict check
The check SHALL run per screen × day × hour over the requested screens, dates and show hours inside each screen's working hours. A request conflicts in an hour when the slots already used there plus the requested slots exceed 12. Slots of another screen or another hour SHALL not count.

#### Scenario: slot taken on the same screen and hour
- **WHEN** existing campaigns use 10 slots on screen AST-001 at 10:00 on 2026-11-03 and a signed-in visitor checks 3 slots there at 10:00–11:00 on that date
- **THEN** `campaigns.checkAvailability` returns 1 conflict `{ screenId: AST-001, date: "2026-11-03", hour: 10, free: 2, requested: 3 }`

#### Scenario: other screen or hour is free
- **WHEN** existing campaigns use 12 slots on screen AST-001 at 10:00 on 2026-11-03 and a signed-in visitor checks 3 slots on screen AST-002 at 10:00, or on AST-001 at 11:00
- **THEN** `campaigns.checkAvailability` returns no conflicts

#### Scenario: conflict is re-checked on save
- **WHEN** the preview showed no conflict, then another campaign took the last free slots of that screen and hour, and the visitor saves
- **THEN** `campaigns.create` fails with `SLOT_CONFLICT` naming that screen, date and hour

### Requirement: Conflict blocks the save
When free slots are not enough, `campaigns.create` SHALL fail with `SLOT_CONFLICT` and `conflicts` (screen, date, hour, free, requested) and SHALL write nothing. The form SHALL show «Недостаточно свободных слотов. Конфликт: {list}.», where `{list}` names each screen in conflict with its date span and merged hour ranges.

#### Scenario: conflict blocks the save
- **WHEN** a signed-in visitor saves a campaign whose request does not fit on 1 screen hour
- **THEN** `campaigns.create` fails with `SLOT_CONFLICT` and a non-empty `conflicts` list
- **AND** the number of campaigns is unchanged and the form stays open with the entered values

#### Scenario: conflict message names screens and hours
- **WHEN** the conflicts are screen AST-001 «{name}» at 10:00 and 11:00 on 2026-11-03 to 2026-11-05
- **THEN** the form shows «Недостаточно свободных слотов. Конфликт: AST-001 {name}: 03.11.2026–05.11.2026, 10:00–12:00.»

### Requirement: Shows only inside dates and hours
A saved campaign SHALL take slots and plan shows only on its screens, on its dates and in its show hours inside each screen's working hours.

#### Scenario: no shows outside the selected dates and hours
- **WHEN** a campaign is saved for 2026-11-03 to 2026-11-05, hours 08:00–20:00, on screen AST-001
- **THEN** the slots of AST-001 on 2026-11-02 and 2026-11-06, and at 07:00 and 20:00 on 2026-11-03, do not show the campaign
- **AND** its planned shows for 2026-11-02 are 0

### Requirement: Saved campaign is shared and kept
After save the campaign SHALL be stored on the server, so it appears in the campaigns list and in «Расписание» for every viewer and after a page refresh. The form SHALL then return to «Рекламные кампании».

#### Scenario: saved campaign is in the list and the schedule
- **WHEN** a signed-in visitor saves a campaign on screen AST-001, hours 08:00–20:00, today
- **THEN** a later read of the `campaigns` table in a new client returns it
- **AND** the 12-slot set of AST-001 at 08:00 today shows its name in its slots

#### Scenario: form returns to the campaigns list
- **WHEN** `campaigns.create` succeeds in the form
- **THEN** the browser opens `/campaigns`

#### Scenario: new campaign has no log shows
- **WHEN** a signed-in visitor saves a campaign that started yesterday
- **THEN** the `showLog` has no rows for it until «Смоделировать показы» runs

### Requirement: Session guard and no status argument
`campaigns.checkAvailability`, `campaigns.create` and `campaigns.generateUploadUrl` SHALL require a valid demo session first and SHALL accept no `status` argument.

#### Scenario: create without a session
- **WHEN** a client calls `campaigns.create` with an unknown or expired session id
- **THEN** the call fails with `UNAUTHENTICATED` and no campaign is written

#### Scenario: check without a session
- **WHEN** a client calls `campaigns.checkAvailability` with an unknown session id
- **THEN** the call fails with `UNAUTHENTICATED`

#### Scenario: upload URL without a session
- **WHEN** a client calls `campaigns.generateUploadUrl` with an unknown session id
- **THEN** the call fails with `UNAUTHENTICATED` and no rate-limit token is consumed

#### Scenario: status argument is rejected
- **WHEN** a client calls `campaigns.create` with valid fields plus `status: "active"`
- **THEN** the argument validator rejects the call and no campaign is written
