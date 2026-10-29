## ADDED Requirements

### Requirement: Global notice covers log values
The shows by the log are simulated. The section SHALL mark them only through the app-shell global notice «Все показатели — демонстрационные данные»; the log column and its values SHALL carry no label of their own. Planned shows and shows by the log stay separate columns.

#### Scenario: log values carry no demo label
- **WHEN** the admin opens «Рекламные кампании»
- **THEN** the page shows the global notice «Все показатели — демонстрационные данные»
- **AND** no row, column header or value shows a «Демонстрационные данные» label

## REMOVED Requirements

### Requirement: Demo label on log values
**Reason**: User decision 2026-10-29 (round c01): the list no longer shows its own «Демонстрационные данные» label; the shell notice covers it.
**Migration**: Use requirement «Global notice covers log values». Replace the test «list carries the demo label» with «log values carry no demo label».
