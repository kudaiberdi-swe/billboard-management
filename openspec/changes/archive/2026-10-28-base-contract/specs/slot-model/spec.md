# Spec Delta

## Purpose

Defines the shared slot rules (the 60-second cycle, which campaign holds which slot in an hour, planned shows, occupancy and slot conflicts) so that every section shows the same numbers.

## ADDED Requirements

### Requirement: Cycle setting
The cycle SHALL be one setting: 60 seconds with slots of 5 seconds, which gives 12 slots per cycle and 60 cycles per hour (D-1). All slot math SHALL read these values from one place.

#### Scenario: cycle values
- **WHEN** the slot functions read the cycle setting
- **THEN** a cycle has 12 slots of 5 seconds and an hour has 60 cycles

#### Scenario: slot time inside the cycle
- **WHEN** the slot set of an hour is built
- **THEN** slot 1 spans 0–5 seconds and slot 12 spans 55–60 seconds

### Requirement: Kazakhstan local time
All dates and hours SHALL be Kazakhstan local time with a fixed UTC+5 offset. Dates are `YYYY-MM-DD` strings; date ranges include both ends; hour ranges are whole hours with the end excluded.

#### Scenario: today in UTC+5
- **WHEN** the server time is 2026-10-30T20:30:00Z
- **THEN** today is `2026-10-31` and the current hour is 1

#### Scenario: invalid date string
- **WHEN** a date argument is `2026-13-01` or `31.10.2026`
- **THEN** the date check rejects it with error code `INVALID_INPUT`

### Requirement: Campaign on a screen in an hour
A campaign SHALL be on for screen S, date d and hour h only when S is in its screens, d is within its dates, h is within its show hours and h is within the working hours of S.

#### Scenario: hour outside the show hours
- **WHEN** a campaign has show hours 08:00–20:00 and the hour is 20
- **THEN** the campaign is not on in that hour

#### Scenario: hour outside the working hours
- **WHEN** a campaign has show hours 00:00–24:00 on a screen that works 07:00–23:00 and the hour is 23
- **THEN** the campaign is not on in that hour

#### Scenario: date outside the period
- **WHEN** a campaign runs 2026-11-01 to 2026-11-10 and the date is 2026-11-11
- **THEN** the campaign is not on that day

### Requirement: Hour slot set
For a screen, date and hour, the system SHALL return 12 slots. The campaigns that are on fill slots from slot 1 in campaign creation order, each taking its slots-per-cycle count in a row; the other slots are «Свободно». The set is the same for every minute of the hour.

#### Scenario: two campaigns share an hour
- **WHEN** campaign A (created first, 2 slots) and campaign B (3 slots) are on for a screen in an hour
- **THEN** slots 1–2 show A, slots 3–5 show B and slots 6–12 are «Свободно»

#### Scenario: partly overlapping campaigns
- **WHEN** campaign A is on 08:00–12:00 and campaign B is on 10:00–14:00 on the same screen
- **THEN** hour 9 shows only A, hour 11 shows A and B, and hour 13 shows only B

#### Scenario: hour slots agree with the screen campaigns
- **WHEN** the slot set of any screen, date and hour is built from the seed
- **THEN** every campaign in it lists that screen in its screens
- **AND** every campaign that is on for that screen, date and hour is in it

### Requirement: Planned shows
Planned shows of a campaign per screen per day SHALL be slots per cycle × 60 × the number of its show hours inside the working hours of that screen, on days inside the period, and 0 on other days and screens (F-6 AC4).

#### Scenario: planned shows example from the SoW
- **WHEN** a campaign has 1 slot per cycle and show hours 08:00–20:00 on 3 screens that work 07:00–23:00
- **THEN** planned shows are 720 per screen per day
- **AND** 2 160 per day for the 3 screens

#### Scenario: planned shows clipped to working hours
- **WHEN** a campaign has 2 slots and show hours 05:00–09:00 on a screen that works 07:00–23:00
- **THEN** planned shows are 2 × 60 × 2 = 240 per day

#### Scenario: no planned shows outside the period
- **WHEN** planned shows are asked for a day before the start date or after the end date
- **THEN** the result is 0

### Requirement: Occupancy
Occupancy % SHALL be occupied slots / all slots in the working hours of the selected screens over the selected days × 100 (D-3), counted per screen hour (12 slots per working hour), with a per-day breakdown.

#### Scenario: occupancy of one screen hour
- **WHEN** one screen works 1 hour on 1 day and campaigns take 3 of its 12 slots
- **THEN** occupancy is 3 occupied of 12 slots, 25%

#### Scenario: occupancy with no working hours
- **WHEN** the selection has no working hours
- **THEN** occupancy is 0 occupied of 0 slots and the percent is 0

### Requirement: Slot conflicts
For a requested campaign rule, the system SHALL return every screen, date and hour where the slots already taken plus the requested slots per cycle exceed 12, with the free count (D-9). An empty result means the rule fits.

#### Scenario: request fits
- **WHEN** a screen hour has 9 occupied slots and the request asks for 3
- **THEN** there is no conflict for that hour

#### Scenario: request does not fit
- **WHEN** a screen hour has 10 occupied slots and the request asks for 3
- **THEN** the result lists that screen, date and hour with 2 free and 3 requested

#### Scenario: conflicts only inside the request
- **WHEN** existing campaigns fill hours outside the requested dates or show hours
- **THEN** those hours are not in the result
