# campaign-card Specification

## Purpose
The campaign card page `/campaigns/:id` shows one campaign in detail, per screen plan and log values, and hosts the «Смоделировать показы» action of F-10 (orchestrator decision G-1).

## Requirements

### Requirement: Card content
The card SHALL show: name, advertiser, period, show hours, slots per 1-minute cycle, creative (placeholder image or uploaded video), status from the dates, cities, planned shows, shows by the log, and a table of the campaign screens with code, name, city, «онлайн» / «офлайн», planned shows and shows by the log per screen. The card SHALL show «Демонстрационные данные».

#### Scenario: card shows campaign details
- **WHEN** the admin opens the card of «Летняя акция»
- **THEN** it shows «Летняя акция», «Demo Cola», the period, the show hours 08:00–22:00, 2 slots per cycle, the creative, «Активна», the cities and the screens table
- **AND** the page shows «Демонстрационные данные»

#### Scenario: per screen values add up to the totals
- **WHEN** the admin opens the card of a campaign with a show log
- **THEN** the per-screen planned shows sum to the card's planned shows
- **AND** the per-screen shows by the log sum to the card's shows by the log

#### Scenario: offline screen is marked on the card
- **WHEN** a campaign has a screen with status «офлайн»
- **THEN** the screens table shows «офлайн» for that screen

### Requirement: Unknown campaign
`campaigns.get` SHALL fail with `NOT_FOUND` (`entity: "campaign"`) when the id is malformed or the campaign no longer exists (for example after «Сбросить демо»). The card SHALL then show the `errors.NOT_FOUND` text and a link back to «Рекламные кампании».

#### Scenario: card of a deleted campaign
- **WHEN** the admin opens `/campaigns/<id>` of a campaign removed by «Сбросить демо»
- **THEN** `campaigns.get` fails with `NOT_FOUND`
- **AND** the page shows «Запись не найдена. Возможно, демо было сброшено.» and «К списку кампаний»

#### Scenario: card with a malformed id
- **WHEN** `campaigns.get` is called with `campaignId` "abc"
- **THEN** it fails with `NOT_FOUND`

### Requirement: Card needs a demo session
`campaigns.get` SHALL refuse a call without a valid demo session with `UNAUTHENTICATED`, before it reads the campaign.

#### Scenario: card without session is refused
- **WHEN** `campaigns.get` is called with an unknown session id and a valid campaign id
- **THEN** it fails with `UNAUTHENTICATED`
- **AND** no campaign data is returned
