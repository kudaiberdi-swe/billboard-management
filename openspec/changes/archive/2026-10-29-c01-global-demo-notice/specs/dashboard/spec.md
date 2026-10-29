## ADDED Requirements

### Requirement: Estimated contacts card under the global notice
The contacts card SHALL show the sum of the D-4 estimate (capability `campaign-contacts`) of every campaign on the selected screens in the period. The simulated cards (shows by the log, estimated contacts, screen looks) SHALL carry no label of their own; the app-shell global notice «Все показатели — демонстрационные данные» marks them (D-4).

#### Scenario: contacts follow D-4
- **WHEN** R-1 opens «Главная» for a period and a set of screens
- **THEN** the contacts card equals the sum of the D-4 estimate of each campaign for those screens and that period

#### Scenario: simulated cards carry no demo label
- **WHEN** R-1 opens «Главная»
- **THEN** the cards for shows by the log, estimated contacts and screen looks show no «Демонстрационные данные» label
- **AND** the page shows the global notice «Все показатели — демонстрационные данные»

## REMOVED Requirements

### Requirement: Estimated contacts card
**Reason**: User decision 2026-10-29 (round c01): the simulated cards no longer carry «Демонстрационные данные»; the shell notice covers them. The D-4 rule is unchanged.
**Migration**: Use requirement «Estimated contacts card under the global notice». The test «contacts follow D-4» keeps its name; replace «simulated cards carry the demo label» with «simulated cards carry no demo label».
