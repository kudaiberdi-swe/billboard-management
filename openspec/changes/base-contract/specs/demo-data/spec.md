# Spec Delta

## Purpose

Gives every section one consistent synthetic data set (100 screens, campaigns, show log, screen events) and lets any viewer restore it with «Сбросить демо».

## ADDED Requirements

### Requirement: Synthetic seed of the network
The seed SHALL create 100 screens in the cities «Астана», «Караганда», «Атырау» and «Восточно-Казахстанская область», built deterministically, with no real brands, no real addresses of buildings, no photos of people and no personal data.

#### Scenario: seed has 100 screens in 4 regions
- **WHEN** `demo.seed` runs on an empty deployment
- **THEN** `screens` holds exactly 100 rows
- **AND** each of the 4 city codes `astana`, `karaganda`, `atyrau`, `east_kz` has at least 1 screen
- **AND** every screen `code` is unique

#### Scenario: seed has offline and camera screens
- **WHEN** the seed has run
- **THEN** at least 1 screen has status `offline` («офлайн») and most screens have status `online` («онлайн»)
- **AND** more than half of the screens have `hasCamera` true and at least 1 has it false
- **AND** between 40% and 60% of the screens have `hasVehicleMetric` true

#### Scenario: seed working hours
- **WHEN** the seed has run
- **THEN** more than half of the screens work 07:00–23:00 (`workStartHour` 7, `workEndHour` 23)
- **AND** at least 1 screen works 24/7 (`workStartHour` 0, `workEndHour` 24)

#### Scenario: seed runs only on an empty deployment
- **WHEN** `demo.seed` runs while `screens` already has rows
- **THEN** no table changes

### Requirement: Seed campaigns and show log
The seed SHALL create campaigns with dates relative to the seed day, including the 3 named campaigns, schedules with occupied and free slots, a show log for at least 1 campaign within plan, and screen events.

#### Scenario: seed has the named campaigns
- **WHEN** the seed has run on any day
- **THEN** campaign «Летняя акция» of «Demo Cola» has status «Активна»
- **AND** campaign «Открытие магазина» of «Demo Market» has status «Активна»
- **AND** campaign «Презентация автомобиля» of «Demo Auto» has status «Запланирована»

#### Scenario: seed has every campaign status
- **WHEN** the seed has run
- **THEN** at least 1 campaign has each status «Запланирована», «Активна» and «Завершена»

#### Scenario: seed schedules have occupied and free slots
- **WHEN** the seed has run
- **THEN** no screen has more than 12 occupied slots in any hour of any day
- **AND** today at least 1 screen hour has an occupied slot and at least 1 screen hour has a slot «Свободно»

#### Scenario: seed has a show log within plan
- **WHEN** the seed has run
- **THEN** `showLog` has rows for at least 1 active campaign
- **AND** every row follows the show-log rule (past part of the period, «онлайн» screens, shows not above planned shows)

#### Scenario: seed audience is available per hour
- **WHEN** the seed has run
- **THEN** the audience generator returns hourly values for every seeded screen with a camera for today

#### Scenario: seed has notifications of both kinds
- **WHEN** the seed has run
- **THEN** the notification rule returns at least 1 «Экран недоступен» and at least 1 «Кампания скоро завершится» for today

#### Scenario: seed has screen events
- **WHEN** the seed has run
- **THEN** every `offline` screen has a `went_offline` event in `screenEvents`

#### Scenario: seed has only Demo advertisers
- **WHEN** the seed has run
- **THEN** every campaign `advertiser` starts with «Demo »
- **AND** no screen or campaign holds a person's name, phone or email

### Requirement: Reset restores the seed
`demo.reset` SHALL, in one transaction, delete all rows of `campaigns`, `showLog`, `screenEvents` and `screens`, delete the uploaded video files referenced by campaigns, and run the seed for today. It SHALL keep `demoSessions`.

#### Scenario: reset deletes user campaigns and restores the seed
- **WHEN** a signed-in visitor has created a campaign and calls `demo.reset`
- **THEN** that campaign no longer exists
- **AND** the data again satisfies every seed scenario above

#### Scenario: reset deletes uploaded videos
- **WHEN** a campaign with a `video` creative exists and a signed-in visitor calls `demo.reset`
- **THEN** the stored file of that video no longer exists

#### Scenario: reset keeps viewers signed in
- **WHEN** a signed-in visitor calls `demo.reset`
- **THEN** `demo.sessionStatus` for every session that was valid before still returns `{ valid: true }`

#### Scenario: reset without a session
- **WHEN** a caller without a valid session calls `demo.reset`
- **THEN** the call fails with error code `UNAUTHENTICATED`
- **AND** the user campaigns stay

### Requirement: One shared data set
All viewers SHALL read and write the same data set; no data is scoped to a session.

#### Scenario: data is shared between sessions
- **WHEN** a campaign is added to `campaigns` while viewer A is signed in, and viewer B with another session then reads data
- **THEN** viewer B sees that campaign
