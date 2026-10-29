## ADDED Requirements

### Requirement: Global demo notice
The shell SHALL show one quiet notice «Все показатели — демонстрационные данные» (secondary text, no colour badge, no close button) once, at the top of the content area of every signed-in page, including in print. The password screen SHALL NOT show it. No page SHALL label a value, card, column, header or block with «Демонстрационные данные».

#### Scenario: notice shows the verbatim text
- **WHEN** a signed-in visitor opens any page of the app
- **THEN** the notice shows exactly «Все показатели — демонстрационные данные»

#### Scenario: notice shows once on every signed-in page
- **WHEN** a signed-in visitor opens each of `/`, `/billboards`, `/campaigns`, `/schedule`, `/analytics`, `/reports`, the card of a screen, the card of a campaign and `/campaigns/new`
- **THEN** each page shows the notice «Все показатели — демонстрационные данные» exactly once, above the page content

#### Scenario: password screen has no notice
- **WHEN** a visitor without a valid session opens any app route
- **THEN** the password screen shows no «Все показатели — демонстрационные данные» notice

#### Scenario: no per-value demo label
- **WHEN** a signed-in visitor opens any page of the app
- **THEN** no element shows the standalone text «Демонстрационные данные»
- **AND** the only demonstration-data text on the page is the global notice, plus the report disclaimer on «Отчёты»

## REMOVED Requirements

### Requirement: Demo label
**Reason**: User decision 2026-10-29 (round c01): per-value «Демонстрационные данные» labels are replaced by one global notice in the shell.
**Migration**: Use requirement «Global demo notice». Delete the `DemoLabel` component and the test «demo label shows the verbatim text»; its check moves to «notice shows the verbatim text».
