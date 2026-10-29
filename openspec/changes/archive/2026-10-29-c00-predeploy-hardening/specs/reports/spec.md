## MODIFIED Requirements

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
