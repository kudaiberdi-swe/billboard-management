## MODIFIED Requirements

### Requirement: Demo audience on the card
The card SHALL show the sum over the last 7 days of estimated people in view, screen looks and, only for screens with the vehicle metric, vehicles, from the shared audience generator. The audience block SHALL carry no label of its own; the app-shell global notice «Все показатели — демонстрационные данные» marks it. A screen without a camera SHALL show «нет камеры».

#### Scenario: card shows the demo audience
- **WHEN** R-1 opens the card of a screen with a camera and the vehicle metric
- **THEN** the audience block shows people in view, looks and vehicles for the 7 days and no «Демонстрационные данные» label
- **AND** the page shows the global notice «Все показатели — демонстрационные данные»

#### Scenario: card of a screen without a camera
- **WHEN** R-1 opens the card of a screen without a camera
- **THEN** the audience block shows «нет камеры» and no numbers

#### Scenario: card of a screen without the vehicle metric
- **WHEN** R-1 opens the card of a screen with a camera and without the vehicle metric
- **THEN** the audience block shows people in view and looks and no vehicles value
