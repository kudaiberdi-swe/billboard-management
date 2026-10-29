## ADDED Requirements

### Requirement: Report disclaimer under the global notice
The report SHALL show the disclaimer «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват» verbatim at its top and in print, with no label next to it. Its simulated values SHALL carry no «Демонстрационные данные» label; the disclaimer and the global notice mark them. The two blocks stay separate.

#### Scenario: report shows the demo disclaimer
- **WHEN** the admin opens any campaign report
- **THEN** it shows «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват» above both blocks
- **AND** the page shows the global notice «Все показатели — демонстрационные данные»
- **AND** the disclaimer is not hidden in print

#### Scenario: report values carry no demo label
- **WHEN** the admin opens any campaign report
- **THEN** the values shows by the log, plan completion, traffic, looks and contacts carry no «Демонстрационные данные» label
- **AND** the disclaimer has no «Демонстрационные данные» label next to it

## MODIFIED Requirements

### Requirement: Browser print
The button «Печать / сохранить в PDF» SHALL open the browser print dialog. The print stylesheet SHALL hide the menu, the filters and the button, print A4 portrait, and keep each block on one page where it fits. The print SHALL keep both the global notice «Все показатели — демонстрационные данные» and the disclaimer.

#### Scenario: print button opens the print dialog
- **WHEN** the admin clicks «Печать / сохранить в PDF»
- **THEN** the browser print dialog opens (`window.print` is called once)

#### Scenario: print view hides menu and filters
- **WHEN** the report page is rendered for print media
- **THEN** the menu, the filters and the «Печать / сохранить в PDF» button are hidden
- **AND** the disclaimer and both blocks are visible

#### Scenario: print view keeps the global notice
- **WHEN** the report page is rendered for print media
- **THEN** the global notice «Все показатели — демонстрационные данные» is visible above the disclaimer
- **AND** the notice carries no print-hiding class

## REMOVED Requirements

### Requirement: Demo disclaimer
**Reason**: User decision 2026-10-29 (round c01): the report values no longer carry «Демонстрационные данные»; the disclaimer (verbatim, unchanged) and the shell notice cover them.
**Migration**: Use requirement «Report disclaimer under the global notice». The test «report shows the demo disclaimer» keeps its name; replace «demo label sits on the simulated values» with «report values carry no demo label».
