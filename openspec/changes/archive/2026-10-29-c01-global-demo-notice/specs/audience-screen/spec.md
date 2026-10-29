## ADDED Requirements

### Requirement: Global notice covers audience values
The blocks with simulated values (value cards, chart, age and gender) SHALL carry no «Демонстрационные данные» label of their own; the app-shell global notice «Все показатели — демонстрационные данные» marks them. The estimate notes stay: «предположительно» on gender and the algorithm-estimate note on age and gender.

#### Scenario: audience values carry no demo label
- **WHEN** R-1 opens «Аналитика аудитории» for a camera screen
- **THEN** the value cards, the chart and the age and gender blocks show no «Демонстрационные данные» label
- **AND** the page shows the global notice «Все показатели — демонстрационные данные»
- **AND** the age and gender blocks still show the algorithm-estimate note

## REMOVED Requirements

### Requirement: Demo label on all values
**Reason**: User decision 2026-10-29 (round c01): the blocks no longer carry «Демонстрационные данные» each; the shell notice covers them.
**Migration**: Use requirement «Global notice covers audience values». Replace the test «all values carry the demo label» with «audience values carry no demo label».
