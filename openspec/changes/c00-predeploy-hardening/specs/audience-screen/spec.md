## MODIFIED Requirements

### Requirement: Screens without a camera
For a screen without a camera the section SHALL show an empty state instead of the audience values, the chart and the profile (ADR-0005): the title «Камеры нет» and the text «На экране {name} нет камеры, поэтому аналитика аудитории недоступна. Выберите экран с камерой.» with the screen name in place of `{name}`.

#### Scenario: screen without a camera
- **WHEN** R-1 selects a billboard without a camera
- **THEN** the section shows the title «Камеры нет» and a text that contains «нет камеры» and the screen name
- **AND** it shows no audience number, chart or profile
