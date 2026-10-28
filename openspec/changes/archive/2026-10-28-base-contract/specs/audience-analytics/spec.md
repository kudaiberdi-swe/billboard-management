# Spec Delta

## Purpose

Provides one deterministic source of simulated screen audience values (traffic, gaze, looks, vehicles, age and gender estimates) that every section reads, so the same screen shows the same numbers everywhere.

## ADDED Requirements

### Requirement: Deterministic audience values
The audience generator SHALL return whole-number values per screen, date and hour from the screen code and the date only: people in view, people with an estimated gaze direction, looks, and vehicles. The same inputs SHALL give the same values on every call and after every reset.

#### Scenario: same inputs give the same values
- **WHEN** the generator runs twice for screen «AST-001», date 2026-10-31, hour 12, once before and once after «Сбросить демо»
- **THEN** both results are equal

#### Scenario: looks never exceed gaze and people
- **WHEN** the generator returns an hour value
- **THEN** looks ≤ people with an estimated gaze ≤ people in view, and every value is a whole number ≥ 0

#### Scenario: hourly values sum to the day
- **WHEN** the generator returns the day value and the 24 hour values of one screen and date
- **THEN** each day field equals the sum of that field over the hours

### Requirement: Audience only where the screen can measure it
Screens without a camera SHALL get no audience values (the UI shows «нет камеры») and add 0 to every audience total. Vehicles SHALL be returned only for screens with the vehicle metric. Values SHALL be 0 outside the screen working hours.

#### Scenario: screen without a camera
- **WHEN** the generator runs for a screen with `hasCamera` false
- **THEN** it returns no value (null) for that screen

#### Scenario: screen without the vehicle metric
- **WHEN** the generator runs for a screen with a camera and `hasVehicleMetric` false
- **THEN** vehicles is null and the other values are present

#### Scenario: hour outside working hours
- **WHEN** a screen works 07:00–23:00 and the hour is 3
- **THEN** all values for that hour are 0

### Requirement: Age and gender estimate
The generator SHALL return per screen the shares of the age groups 18–24, 25–34, 35–44, 45–54, 55+ and of gender, as whole percents that each sum to 100. They are an algorithm estimate, labelled «предположительно» in the UI (D-10).

#### Scenario: shares sum to 100
- **WHEN** the generator returns the profile of a screen with a camera
- **THEN** the 5 age group percents sum to 100 and the gender percents sum to 100
