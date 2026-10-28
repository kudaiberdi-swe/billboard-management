# app-shell Specification

## Purpose
Defines the shared frame of the web app: the password screen, the left menu with the 6 sections, «Сбросить демо», the «Демонстрационные данные» label and the Russian strings module that all screens use.

## Requirements

### Requirement: Password screen
Without a valid session the app SHALL show only the password screen. After the correct password it SHALL open «Главная». A wrong password SHALL show the text of `WRONG_PASSWORD`, too many attempts the text of `RATE_LIMITED`, and the password screen stays.

#### Scenario: visitor without a session sees only the password screen
- **WHEN** a visitor opens any app route, for example `/campaigns`, without a valid session
- **THEN** only the password screen shows, with no menu and no data

#### Scenario: correct password opens Главная
- **WHEN** the visitor enters the correct password and submits
- **THEN** the app shows «Главная» at `/` with the left menu

#### Scenario: wrong password shows an error
- **WHEN** the visitor enters a wrong password and submits
- **THEN** the screen shows «Неверный пароль.» and the app stays closed

#### Scenario: expired session returns to the password screen
- **WHEN** a guarded call fails with `UNAUTHENTICATED` while the app is open
- **THEN** the app shows the password screen

### Requirement: Left menu
The app SHALL have a left menu with the 6 sections in the ТЗ order: «Главная», «Билборды», «Рекламные кампании», «Расписание», «Аналитика аудитории», «Отчёты». Each item opens its section. The menu shows the product name «BillBoard» as text.

#### Scenario: menu shows the 6 sections in order
- **WHEN** a signed-in visitor opens the app
- **THEN** the menu lists «Главная», «Билборды», «Рекламные кампании», «Расписание», «Аналитика аудитории», «Отчёты» in this order

#### Scenario: menu item opens its section
- **WHEN** the visitor clicks each menu item
- **THEN** the routes `/`, `/billboards`, `/campaigns`, `/schedule`, `/analytics`, `/reports` open, and the clicked item is marked current

#### Scenario: unknown route
- **WHEN** a signed-in visitor opens `/unknown`
- **THEN** the app opens «Главная»

### Requirement: Reset with confirmation
The menu SHALL have the button «Сбросить демо». It SHALL ask for confirmation, and only after confirmation call `demo.reset`.

#### Scenario: reset asks for confirmation
- **WHEN** the visitor clicks «Сбросить демо»
- **THEN** a confirmation dialog opens and no data changes yet

#### Scenario: reset cancelled
- **WHEN** the visitor clicks «Отмена» in the dialog
- **THEN** the dialog closes and `demo.reset` is not called

#### Scenario: reset confirmed
- **WHEN** the visitor confirms in the dialog
- **THEN** `demo.reset` runs and the app shows «Главная» with the seed data

### Requirement: Demo label
The app SHALL provide one label component with the text «Демонстрационные данные» that every screen with simulated values uses.

#### Scenario: demo label shows the verbatim text
- **WHEN** the demo label component renders
- **THEN** it shows exactly «Демонстрационные данные»

### Requirement: Russian strings module and error texts
All UI text SHALL come from one shared Russian strings module. The backend SHALL return error codes and data, never Russian text; the front SHALL turn each code into its text from the module, and show the `UNKNOWN` text for any other error.

#### Scenario: error code becomes text
- **WHEN** a call fails with error code `NOT_FOUND`
- **THEN** the front shows «Запись не найдена. Возможно, демо было сброшено.»

#### Scenario: unknown error
- **WHEN** a call fails with an error that has no known code
- **THEN** the front shows «Что-то пошло не так. Обновите страницу.»

#### Scenario: status codes become text
- **WHEN** the front shows the status codes `planned`, `active`, `finished`, `online`, `offline`
- **THEN** it shows «Запланирована», «Активна», «Завершена», «онлайн», «офлайн»

#### Scenario: no inline text in components
- **WHEN** the strings check scans `src/`
- **THEN** no component holds Cyrillic text outside the strings module
