# date-inputs Specification

## Purpose
One product date window for every date a client sends to the backend, so that no campaign, period or log date falls outside years 2000–2100, and period loops always end (security audit KI-05).

## Requirements

### Requirement: Dates inside the product window
Every date argument of a public function SHALL be a real calendar date "YYYY-MM-DD" with a year from 2000 to 2100. Otherwise the call SHALL fail with `INVALID_INPUT` and the argument name as `field`, before it computes any period value or writes anything. This covers `campaigns.checkAvailability` and `campaigns.create` (`startDate`, `endDate`), `dashboard.summary` (`from`, `to`), `analytics.screenPeriod` (`from`, `to`), `reports.campaign` (`from`, `to` when given) and `schedule.day` (`date`).

#### Scenario: window edges are accepted
- **WHEN** a date argument is "2000-01-01" or "2100-12-31"
- **THEN** the date check accepts it

#### Scenario: year outside the window is refused
- **WHEN** a signed-in visitor calls `dashboard.summary` with `from` and `to` "9999-12-31", or "1999-12-31", or "2101-01-01"
- **THEN** the call fails with `INVALID_INPUT` naming the date field

#### Scenario: far date is refused by every entry point
- **WHEN** a signed-in visitor calls `analytics.screenPeriod`, `dashboard.summary`, `campaigns.checkAvailability` or `campaigns.create` with the date "9999-12-31"
- **THEN** each call fails with `INVALID_INPUT`
- **AND** `campaigns.create` writes no campaign

### Requirement: Period iteration is bounded
Every list of days from `from` to `to` SHALL have exactly (`to` − `from` + 1) days, and SHALL be empty when `to` is before `from`. Its length comes from the day count, never from a string compare of dates.

#### Scenario: period lists each day once
- **WHEN** the days from 2026-10-30 to 2026-11-02 are listed
- **THEN** the list is 2026-10-30, 2026-10-31, 2026-11-01, 2026-11-02

#### Scenario: reversed period is empty
- **WHEN** the days from 2026-11-02 to 2026-10-30 are listed
- **THEN** the list is empty

#### Scenario: last calendar day does not loop
- **WHEN** the days from 9999-12-31 to 9999-12-31 are listed
- **THEN** the list holds exactly 1 day
