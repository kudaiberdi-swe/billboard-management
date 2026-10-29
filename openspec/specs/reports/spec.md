# reports Specification

## Purpose
The «Отчёты» section shows the report of one campaign that the network owner gives to the advertiser: plan versus demo log, and simulated screen analytics, in 2 separate blocks, printable from the browser (SoW §4.9 F-9, D-12).

## Requirements

### Requirement: Report filters
The report SHALL have filters «Кампания», «Период», «Город», «Билборд», kept in URL search params `campaign`, `from`, `to`, `city`, `screen`. The period defaults to the campaign period and is clipped to it. «Город» and «Билборд» list only the campaign's cities and screens. Without a selected campaign the section shows «Выберите кампанию».

#### Scenario: filter by period narrows the report
- **WHEN** the admin sets «Период» to the first 3 days of «Летняя акция»
- **THEN** planned shows, shows by the log, the per-day chart and the screen analytics cover only those 3 days

#### Scenario: filter by city narrows the report
- **WHEN** the admin selects «Караганда» for «Летняя акция»
- **THEN** every value of both blocks covers only the campaign screens in «Караганда»

#### Scenario: filter by billboard narrows the report
- **WHEN** the admin selects one screen of «Летняя акция» in «Билборд»
- **THEN** the per-screen distribution has one row and the totals equal that row

#### Scenario: filters live in the URL
- **WHEN** the admin opens `/reports?campaign=<id>&city=karaganda` in a new tab
- **THEN** the report shows that campaign filtered by «Караганда»

#### Scenario: no campaign selected
- **WHEN** the admin opens «Отчёты» without a `campaign` param
- **THEN** the section shows the «Кампания» filter and «Выберите кампанию» and no report blocks

### Requirement: Report content
The report SHALL show: campaign name and advertiser; the period; cities and screens; planned shows («Запланированные показы»); shows by the log («Показы по журналу»); plan completion % («Процент выполнения плана»); estimated screen traffic for the period; demo screen looks; estimated contacts with the campaign (D-4, same helper as «Главная»); a chart of planned shows and shows by the log per day; the distribution per screen (planned, log, completion %).

#### Scenario: report shows all values
- **WHEN** the admin opens the report of «Летняя акция» without other filters
- **THEN** it shows «Летняя акция», «Demo Cola», the campaign period, «Астана» and «Караганда», the screens, the planned shows, the shows by the log, the completion %, the traffic, the looks, the contacts, one chart point per day and one row per screen
- **AND** the per-day values and the per-screen values each sum to the totals

#### Scenario: contacts match the dashboard helper
- **WHEN** the report runs for a campaign, screens and period
- **THEN** its contacts equal `estimateContacts` of f02-dashboard for the same campaign, screens and period

#### Scenario: screen without a camera adds no analytics
- **WHEN** the selected screens include a screen without a camera
- **THEN** that screen adds 0 to traffic, looks and contacts
- **AND** the block shows the number of screens with «нет камеры»

### Requirement: Plan completion formula
Plan completion % SHALL be shows by the log / planned shows × 100, rounded to 1 decimal. When planned shows are 0 the report SHALL show «—» instead of a percent.

#### Scenario: completion follows the formula
- **WHEN** the selection has 720 planned shows and 648 shows by the log
- **THEN** «Процент выполнения плана» is 90,0 %

#### Scenario: zero plan shows a dash
- **WHEN** the selected period has 0 planned shows
- **THEN** «Процент выполнения плана» shows «—»

### Requirement: Two separate blocks
The report SHALL have 2 separate blocks: «Результаты размещения» (planned shows, shows by the log, completion %, per-day chart, per-screen distribution) and «Аналитика экранов» (traffic, looks, contacts). No value of one block SHALL appear in the other.

#### Scenario: report has two separate blocks
- **WHEN** the admin opens any campaign report
- **THEN** the page has a block titled «Результаты размещения» with the plan and log values
- **AND** a separate block titled «Аналитика экранов» with the traffic and looks values

### Requirement: No confirmed audience claim
No label, title or note of the report SHALL call the screen traffic, looks or contacts a confirmed audience, confirmed reach or confirmed contacts of the ad. Only the disclaimer may contain «подтверждают» or «охват».

#### Scenario: no label claims a confirmed audience
- **WHEN** the strings of the `reports` namespace are checked
- **THEN** no string except the disclaimer contains «подтвержд» or «охват»

### Requirement: Demo disclaimer
The report SHALL show, at its top and in print, «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват» verbatim, with no label next to it. Each simulated value of the report (shows by the log, plan completion, traffic, looks, contacts) SHALL carry the label «Демонстрационные данные».

#### Scenario: report shows the demo disclaimer
- **WHEN** the admin opens any campaign report
- **THEN** it shows «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват» above both blocks
- **AND** it shows «Демонстрационные данные»
- **AND** the disclaimer is not hidden in print

#### Scenario: demo label sits on the simulated values
- **WHEN** the admin opens any campaign report
- **THEN** the values shows by the log, plan completion, traffic, looks and contacts each carry «Демонстрационные данные»
- **AND** the disclaimer has no «Демонстрационные данные» label next to it

### Requirement: Browser print
The button «Печать / сохранить в PDF» SHALL open the browser print dialog. The print stylesheet SHALL hide the menu, the filters and the button, print A4 portrait, and keep each block on one page where it fits.

#### Scenario: print button opens the print dialog
- **WHEN** the admin clicks «Печать / сохранить в PDF»
- **THEN** the browser print dialog opens (`window.print` is called once)

#### Scenario: print view hides menu and filters
- **WHEN** the report page is rendered for print media
- **THEN** the menu, the filters and the «Печать / сохранить в PDF» button are hidden
- **AND** the disclaimer and both blocks are visible

### Requirement: Seeded report is complete
A seeded campaign with a seeded show log SHALL have a full report right after «Сбросить демо».

#### Scenario: seeded campaign has a full report
- **WHEN** the admin opens the report of «Летняя акция» right after «Сбросить демо»
- **THEN** planned shows, shows by the log, traffic, looks and contacts are greater than 0
- **AND** completion % is greater than 0 and not greater than 100
- **AND** the per-day chart and the per-screen distribution are not empty

### Requirement: Report refusals
`reports.campaign` SHALL refuse: no valid demo session with `UNAUTHENTICATED`; a malformed or missing campaign id with `NOT_FOUND` (`entity: "campaign"`); a malformed date, `from` after `to`, or a period over 366 days with `INVALID_INPUT` (`field` "from" or "to"); a billboard that is not a screen of the campaign with `INVALID_INPUT` (`field` "screenId"). The page SHALL show the `errors.<CODE>` text.

#### Scenario: report without session is refused
- **WHEN** `reports.campaign` is called with an unknown session id
- **THEN** it fails with `UNAUTHENTICATED`

#### Scenario: report of a deleted campaign
- **WHEN** `reports.campaign` is called with the id of a campaign removed by «Сбросить демо»
- **THEN** it fails with `NOT_FOUND`
- **AND** the page shows «Запись не найдена. Возможно, демо было сброшено.»

#### Scenario: period end before start is refused
- **WHEN** `reports.campaign` is called with `from` 2026-10-20 and `to` 2026-10-10
- **THEN** it fails with `INVALID_INPUT` and `field` "to"

#### Scenario: malformed date is refused
- **WHEN** `reports.campaign` is called with `from` "2026-13-01"
- **THEN** it fails with `INVALID_INPUT` and `field` "from"

#### Scenario: billboard outside the campaign is refused
- **WHEN** `reports.campaign` is called with a `screenId` that is not a screen of the campaign
- **THEN** it fails with `INVALID_INPUT` and `field` "screenId"
