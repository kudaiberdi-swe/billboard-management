# Spec Delta

## Purpose

The «Аналитика аудитории» section: the simulated audience of one screen for a selected period, with demo labels, estimate notes and no personal data.

## ADDED Requirements

### Requirement: Screen period values
For the selected billboard and period the section SHALL show: estimated people in view («трафик»), screen looks («взгляд на экран»), and the look share. Each value SHALL be the sum over the days of the period of the generator values of that screen (capability `audience-analytics`). Default: the first billboard of the picker and the 7 days ending today (UTC+5).

#### Scenario: screen period values
- **WHEN** R-1 selects a billboard with a camera and a period of 7 days
- **THEN** the people in view and the looks equal the sums of the generator day values of that screen over the 7 days

#### Scenario: look share among gaze
- **WHEN** the period has people with an estimated gaze direction
- **THEN** the look share shows looks / people with an estimated gaze × 100 with one decimal
- **AND** it shows 0 when no person has an estimated gaze direction

#### Scenario: no session is refused
- **WHEN** a caller without a valid demo session asks for the screen analytics
- **THEN** the request fails with `UNAUTHENTICATED` and no values are returned

#### Scenario: invalid period is refused
- **WHEN** the screen analytics are asked with a start date after the end date, a date that is not "YYYY-MM-DD", or a period longer than 366 days
- **THEN** the request fails with `INVALID_INPUT` naming the field

#### Scenario: unknown billboard is refused
- **WHEN** the screen analytics are asked with a billboard id that no longer exists (for example after «Сбросить демо»)
- **THEN** the request fails with `NOT_FOUND` and the page shows the `errors.NOT_FOUND` text

### Requirement: Vehicles only where measured
Estimated vehicles SHALL be shown only for screens with the vehicle metric (about half of screens, D-10). For other screens the vehicles value SHALL not be shown.

#### Scenario: vehicles only where measured
- **WHEN** R-1 selects a camera screen with the vehicle metric, then a camera screen without it
- **THEN** the first shows the summed vehicles of the period and the second shows no vehicles value

### Requirement: Screens without a camera
For a screen without a camera the section SHALL show «нет камеры» instead of the audience values, the chart and the profile (ADR-0005).

#### Scenario: screen without a camera
- **WHEN** R-1 selects a billboard without a camera
- **THEN** the section shows «нет камеры» and no audience number, chart or profile

### Requirement: Age and gender estimate
The section SHALL show the shares of the age groups 18–24, 25–34, 35–44, 45–54, 55+ and of gender labelled «предположительно» (D-10). Both blocks SHALL carry the note that they are an algorithm estimate.

#### Scenario: age groups and gender
- **WHEN** R-1 selects a billboard with a camera
- **THEN** the section shows the 5 age groups «18–24», «25–34», «35–44», «45–54», «55+» with percents that sum to 100
- **AND** the gender block is labelled «предположительно» and its percents sum to 100

#### Scenario: estimate note on age and gender
- **WHEN** the age and gender blocks are shown
- **THEN** each block shows the note that the values are an algorithm estimate

### Requirement: Audience and looks per hour
The section SHALL show a chart with 24 points, hours 0 to 23; each point SHALL hold the people in view and the looks of that hour summed over the days of the period.

#### Scenario: audience and looks per hour
- **WHEN** R-1 selects a camera screen that works 07:00–23:00 and a period of 3 days
- **THEN** the chart has 24 points, the hours outside 07:00–23:00 are 0, and the point values sum to the period totals

### Requirement: Glossary terms
The section SHALL name its values with the terms «трафик», «взгляд на экран», «показ рекламы», «контакт с кампанией» as defined in SoW §10.1, and SHALL show a terms block with the 4 terms and their meaning. No label SHALL call the screen audience a «контакт с кампанией» or a «показ рекламы».

#### Scenario: glossary terms are used
- **WHEN** R-1 opens «Аналитика аудитории»
- **THEN** the people value is labelled with «трафик», the looks value with «взгляд на экран», and the terms block lists «трафик», «взгляд на экран», «показ рекламы», «контакт с кампанией»

### Requirement: No personal data
The section and its query SHALL return and show only aggregate numbers and screen fields: no photos of people, no names of people, no other personal data.

#### Scenario: no personal data
- **WHEN** R-1 opens «Аналитика аудитории» for any billboard
- **THEN** the query result holds only the screen code, name, city, camera and vehicle flags and numbers
- **AND** the page shows no image of a person

### Requirement: Demo label on all values
Every block with simulated values (value cards, chart, age and gender) SHALL show «Демонстрационные данные».

#### Scenario: all values carry the demo label
- **WHEN** R-1 opens «Аналитика аудитории» for a camera screen
- **THEN** the value cards, the chart and the age and gender blocks each show «Демонстрационные данные»
