# campaign-contacts Specification

## Purpose
One definition of the estimated contacts with a campaign (D-4), so «Главная» and «Отчёты» show the same number for the same campaign, screens and period.

## Requirements

### Requirement: D-4 contacts estimate
Estimated contacts of a campaign on a screen and day SHALL be the traffic during the campaign shows × the screen look rate, summed over the hours the campaign is on: people in view of the hour × (slots per cycle / 12) × (looks / people of the hour), rounded to a whole number per screen and day. Hours outside the campaign dates and hours, or outside the screen working hours, SHALL add 0.

#### Scenario: contacts follow the formula
- **WHEN** a campaign with 2 slots per cycle is on one camera screen from 08:00 to 10:00 on one day
- **THEN** its contacts for that screen and day equal round((looks of hour 8 + looks of hour 9) × 2 / 12)

#### Scenario: hours off the campaign add nothing
- **WHEN** the period includes days before the campaign start and hours outside its show hours
- **THEN** those days and hours add 0 contacts

#### Scenario: contacts never exceed looks
- **WHEN** the estimate runs for any campaign, screen and day
- **THEN** the contacts are a whole number ≥ 0 and not greater than the looks of that screen and day

### Requirement: No camera adds no contacts
A screen without a camera SHALL add 0 contacts (no audience values, ADR-0005, «нет камеры»).

#### Scenario: screen without a camera adds zero
- **WHEN** a campaign runs on a camera screen and on a screen without a camera
- **THEN** the screen without a camera has 0 contacts and the total equals the contacts of the camera screen

### Requirement: Totals per day and per screen
The estimate SHALL return the total for the given screens and period, the values per day and the values per screen. The per-day values and the per-screen values SHALL each sum to the total.

#### Scenario: parts sum to the total
- **WHEN** the estimate runs for a campaign over 3 screens and 5 days
- **THEN** the 5 per-day values sum to the total and the 3 per-screen values sum to the total

#### Scenario: same inputs give the same contacts
- **WHEN** the estimate runs twice for the same campaign, screens and period
- **THEN** both results are equal
