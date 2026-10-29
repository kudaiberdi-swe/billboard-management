# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: the echo-sdlc architecture stage decides it (`decisions/ARCHITECTURE.md`). Fixed inputs: Convex backend, self-hosted (Docker on own VM), hosted on Azure. For now the demo runs locally; the Azure deploy comes later.

## Users

- **«Администратор сети / владелец билбордов»**: owns a network of about 100 digital billboards in Kazakhstan (Astana, Karaganda, Atyrau, East Kazakhstan region). Judges whether the future platform lets them run the network, sell placements and prove results to advertisers.
- **The executor team (Echo Brain)**: drives the demo in front of clients on a laptop.
- **Clients after deploy**: may open the deployed demo themselves and click through it with a shared password.
- **«Рекламодатель»**: no account. Sees only the printable campaign report.

## Product Purpose

An interactive web demo of a digital-billboard management platform. It shows the business logic: network state, campaigns, 5-second slot schedule, inventory occupancy, simulated audience analytics and an advertiser report. Success: a client walks the ТЗ §12 scenario end to end and believes the future product can run their network and sell placements.

## Positioning

Honest proof. Planned shows, shows by the log and screen audience are three different things, and the product never blurs them. A report separates «Результаты размещения» from «Аналитика экранов» and never presents screen audience as confirmed audience of an ad. An advertiser can trust what the report says because it says only what it can prove.

## Operating Context

- Shown to clients in meetings on a laptop browser; after deploy, clients may use it alone.
- Desktop laptop screen only. No mobile layout.
- Reports are printed or saved to PDF through the browser.
- All data is synthetic. Shared data across viewers; «Сбросить демо» restores the seed before a meeting.

## Capabilities and Constraints

- UI in Russian only; currency tenge; no prices in the demo.
- 6 sections: «Главная», «Билборды», «Рекламные кампании», «Расписание», «Аналитика аудитории», «Отчёты».
- Slot model for the demo: 60-second cycle of 12 slots of 5 seconds; no double booking of a slot on one screen in one hour.
- One global notice «Все показатели — демонстрационные данные» sits at the top of every signed-in page (and on the printed report); values carry no per-value label. The report also carries «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват».
- Terms kept apart: «трафик», «взгляд на экран», «показ рекламы», «контакт с кампанией».
- Age and gender shown as an algorithm estimate («предположительно»). No photos of people, names or personal data.
- Full scope and decisions: `docs/SoW.md`.
- Undecided: commercial slot model, prices, phase 2 scope (`docs/SoW.md` §8.2).

## Brand Commitments

- Name: «BillBoard», shown as text. No logo or brand colours exist.
- Advertisers in demo data are fictional («Demo Cola», «Demo Market», «Demo Auto»). No real brands.

## Evidence on Hand

- Client ТЗ: `docs/client/ТЗ на демо - Наружная реклама (final).pdf`.
- No real screen photos, no real audience data, no customers, testimonials or metrics. Do not fabricate them; use clearly marked demo images and values.

## Product Principles

1. Never let a simulated or estimated number look like a confirmed one.
2. Plan, log and audience stay visibly separate everywhere.
3. The ТЗ §12 meeting scenario must work smoothly before anything else.
4. Show the owner's whole network at a glance, then let them drill to one screen and one 5-second slot.
