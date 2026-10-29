## MODIFIED Requirements

### Requirement: Screen list
The «Билборды» section SHALL list every screen of the network sorted by code. Each row SHALL show: name and code; city and address; the screen image; status «онлайн» or «офлайн»; working hours; slot occupancy, %; the count of «Активна» campaigns on the screen; camera yes / no; the approximate audience for the period. The audience column and its values SHALL carry no label of their own; the app-shell global notice «Все показатели — демонстрационные данные» marks them.

#### Scenario: list shows the 100 seed screens in 4 regions
- **WHEN** R-1 opens «Билборды» with no filters after the seed
- **THEN** the list has 100 rows
- **AND** the cities are «Астана», «Караганда», «Атырау» and «Восточно-Казахстанская область», each with at least one row

#### Scenario: list row shows every required field
- **WHEN** R-1 opens «Билборды»
- **THEN** each row shows the name and code, the city and address, the image from `public/demo/screens/` by the screen image key, the status «онлайн» or «офлайн», the working hours, the occupancy %, the active campaigns count, the camera yes / no and the audience for the period
- **AND** no row, column header or value shows a «Демонстрационные данные» label
- **AND** the page shows the global notice «Все показатели — демонстрационные данные»

#### Scenario: seed has offline screens
- **WHEN** R-1 opens «Билборды» after the seed
- **THEN** at least one row shows «офлайн» and at least one row shows «онлайн»

#### Scenario: list without a session is refused
- **WHEN** a caller requests the screen list with no valid demo session
- **THEN** the call fails with `UNAUTHENTICATED` and returns no rows
