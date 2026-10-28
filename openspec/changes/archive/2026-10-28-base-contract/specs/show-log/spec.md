# Spec Delta

## Purpose

Defines the simulated show log rule used by the seed and by «Смоделировать показы», so that shows by the log stay a separate record that never exceeds planned shows.

## ADDED Requirements

### Requirement: Show log simulation rule
For a campaign, the simulation SHALL produce one row per screen and day with `shows` = floor(planned shows × f), where f is a deterministic factor in 0.85–1.0 from the campaign, screen and date. Rows exist only for screens with status «онлайн» and days from the start date up to today; for today only finished hours count.

#### Scenario: log never exceeds plan
- **WHEN** the simulation runs for any campaign
- **THEN** every row has shows ≤ planned shows of that screen and day

#### Scenario: no log on offline screens
- **WHEN** a campaign has a screen with status `offline`
- **THEN** the simulation writes no row for that screen

#### Scenario: no log in the future
- **WHEN** today is 2026-10-31 at hour 10 and a campaign runs 2026-10-25 to 2026-11-10 with show hours 08:00–20:00
- **THEN** rows exist for 2026-10-25 to 2026-10-31 only
- **AND** the 2026-10-31 row counts hours 08 and 09 only

#### Scenario: campaign not started has no log
- **WHEN** the simulation runs for a campaign whose start date is after today
- **THEN** it produces no rows

#### Scenario: rerun replaces the log
- **WHEN** the simulation runs twice for the same campaign on the same day
- **THEN** the campaign has the same rows as after the first run, not twice as many

### Requirement: Log is separate from the plan
Shows by the log SHALL come only from `showLog` rows. A campaign without rows SHALL have 0 shows by the log, whatever its planned shows are.

#### Scenario: new campaign has no log
- **WHEN** a campaign exists and the simulation has not run for it
- **THEN** its shows by the log are 0
