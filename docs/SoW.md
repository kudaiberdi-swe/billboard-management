Status: approved 2026-10-28

# Statement of Work: billboard-management

Client: BillBoard. Executor: Echo Brain. Version: 0.1, 2026-10-28.

Sources: «ТЗ на демо - Наружная реклама (final).pdf» (below: ТЗ), `docs/explainer/index.html` (approved 2026-10-28, with the team decisions D-1 to D-13 in §8.1).

## 1. About the project

The client owns a network of about 100 digital billboards in Kazakhstan: Astana, Karaganda, Atyrau and the East Kazakhstan region (ТЗ §2).
The client wants a single platform to manage screens, sell ad placements and confirm results to advertisers (ТЗ §1).
This phase is an interactive web demo. It shows the business logic of the future product to the client (ТЗ §1).
The demo does not connect to real screens or cameras. Ad playback and audience analytics are simulated. The UI marks simulated values with «Демонстрационные данные» (ТЗ §1, §5).
Main user: «Администратор сети / владелец билбордов» (ТЗ §4). The demo also shows the report view that an advertiser gets in the future (ТЗ §4).
Executor: Echo Brain.

## 2. Scope

### 2.1 Phases and deadlines

| Phase | Content | Deadline |
| --- | --- | --- |
| 1 | Interactive web demo: features F-1 to F-11 | 2026-10-31 (client decision, 2026-10-28) |
| 2 | Next stage: real integrations and items in §9 | TODO(client): content and deadline of phase 2 (Q-01) |

### 2.2 Components

| Component | Users | Platform |
| --- | --- | --- |
| Web app (admin, 6 sections) | R-1 | Desktop browser, laptop screen (ТЗ §3, §13) |
| Report view for advertisers (printable page) | R-1 shows it to R-2 | Desktop browser, browser print (ТЗ §11) |
| Backend and data store | — | Convex, self-hosted (Docker on own VM) on Azure (project `CLAUDE.md`) |
| Demo seed data and «Сбросить демо» reset | R-1 | Backend (D-13) |

### 2.3 Feature list

| ID | Feature | Client ref | Phase |
| --- | --- | --- | --- |
| F-1 | Navigation, demo labels, demo access and reset | ТЗ §5, §13, D-13 | 1 |
| F-2 | «Главная» dashboard | ТЗ §6 | 1 |
| F-3 | «Билборды» list, filters and map | ТЗ §7, D-7 | 1 |
| F-4 | Billboard card | ТЗ §7 | 1 |
| F-5 | «Рекламные кампании» list | ТЗ §8 | 1 |
| F-6 | Campaign creation with slot check and plan calculation | ТЗ §8, D-1, D-8, D-9 | 1 |
| F-7 | «Расписание» | ТЗ §9 | 1 |
| F-8 | «Аналитика аудитории» | ТЗ §10, D-10 | 1 |
| F-9 | «Отчёты» and print | ТЗ §11, D-12 | 1 |
| F-10 | «Смоделировать показы» action | ТЗ §12 | 1 |
| F-11 | Demo seed data | ТЗ §7, §13, D-2, D-10 | 1 |

## 3. Roles

| ID | Role | Who | Main actions |
| --- | --- | --- | --- |
| R-1 | «Администратор сети / владелец билбордов» | The network owner and staff (ТЗ §4) | Sees screens, campaigns, schedule, analytics and reports. Creates campaigns and assigns slots. |
| R-2 | «Рекламодатель» (report view only) | Advertiser, future user (ТЗ §4) | No account in phase 1. Receives the printed or shown report. |

The demo has no separate user accounts or permission system (ТЗ §4). Access to the demo is one shared password (D-13).

## 4. Functions

### 4.1 F-1: Navigation, demo labels, demo access and reset

Description: The app has a left menu with 6 sections: «Главная», «Билборды», «Рекламные кампании», «Расписание», «Аналитика аудитории», «Отчёты» (ТЗ §5). Each screen with simulated values shows «Демонстрационные данные» (ТЗ §5). One shared password protects the demo. All viewers see the same data. The «Сбросить демо» button restores the seed data (D-13).

Roles: R-1.

Acceptance criteria:

1. The menu shows the 6 sections in the ТЗ order. Each item opens its section.
2. Each screen with simulated values shows the label «Демонстрационные данные».
3. A visitor without the shared password sees only the password screen. After the correct password the visitor sees «Главная».
4. A wrong password shows an error message and does not open the app.
5. «Сбросить демо» asks for confirmation. After confirmation all campaigns created by users are deleted and the seed data is restored.
6. Data created by one viewer is visible to another viewer after a page refresh.

Notifications: None.

### 4.2 F-2: «Главная» dashboard

Description: The dashboard shows the state of the network and key values for the selected period (ТЗ §6).

Roles: R-1.

Acceptance criteria:

1. Cards show: screens in the network; screens online and offline; active campaigns; inventory occupancy, %; planned shows; shows by the demo log; estimated audience contacts; screen looks (demo value) (ТЗ §6).
2. Planned shows and shows by the log are 2 separate cards (ТЗ §6).
3. Occupancy % = occupied slots / all slots in the working hours of the selected screens for the period × 100 (D-3).
4. Estimated contacts = estimated traffic during the campaign shows × the screen look rate. The card carries the demo label (D-4).
5. A chart shows occupancy per day. A block shows screens per city. A list shows active campaigns (ТЗ §6).
6. Filters «период», «город», «билборд» change all cards and charts (ТЗ §6).

Notifications:

| Event | Recipient | Channel | Text |
| --- | --- | --- | --- |
| Screen status is «офлайн» | R-1 | In-app list on «Главная» | «Экран недоступен» + screen name (ТЗ §6) |
| Campaign end date is 3 days away or less (D-5) | R-1 | In-app list on «Главная» | «Кампания скоро завершится» + campaign name (ТЗ §6) |

### 4.3 F-3: «Билборды» list, filters and map

Description: The section shows all screens of the network (ТЗ §7).

Roles: R-1.

Acceptance criteria:

1. The list shows 100 test billboards in Astana, Karaganda, Atyrau and the East Kazakhstan region (ТЗ §7, §14.2).
2. Each row or card shows: name or ID; city and address; photo or demo image; status «онлайн» / «офлайн»; working hours; slot occupancy; active campaigns count; camera yes / no; approximate audience for the period (demo value) (ТЗ §7).
3. Filters work: city, screen status, camera, occupancy, search by name or address (ТЗ §7, §14.2).
4. A map shows the screens (Leaflet + OpenStreetMap). If the map does not load, the list stays usable (D-7).
5. Some screens have status «офлайн» (ТЗ §7).

Notifications: None.

### 4.4 F-4: Billboard card

Description: The card shows one screen in detail (ТЗ §7).

Roles: R-1.

Acceptance criteria:

1. The card shows: image, location, status, working hours, current occupancy, assigned campaigns, schedule, demo audience analytics, recent events such as a screen going offline (ТЗ §7, §14.3).
2. The campaigns on the card match the occupied slots of that screen in «Расписание» (ТЗ §13).

Notifications: None.

### 4.5 F-5: «Рекламные кампании» list

Description: The section lists campaigns (ТЗ §8).

Roles: R-1.

Acceptance criteria:

1. The seed has at least: «Летняя акция» / «Demo Cola» / «Активна»; «Открытие магазина» / «Demo Market» / «Активна»; «Презентация автомобиля» / «Demo Auto» / «Запланирована» (ТЗ §8).
2. Each campaign shows: name, advertiser, period, cities and screens, status, planned shows, shows by the demo log (ТЗ §8).
3. Status is computed from the dates: before the start «Запланирована», between start and end «Активна», after the end «Завершена» (D-6).
4. No real brand names appear in the seed data (ТЗ §8).

Notifications: None.

### 4.6 F-6: Campaign creation with slot check and plan calculation

Description: The user creates a campaign and assigns slots (ТЗ §8).

Roles: R-1.

Acceptance criteria:

1. The form has: name, advertiser, start and end dates, 1 or more screens, show hours, number of 5-second slots per 1-minute cycle, creative (ТЗ §8, §14.4).
2. The cycle is 60 seconds with 12 slots of 5 seconds. The cycle length is one setting (ТЗ §2, D-1).
3. Creative: the user picks 1 of 3–4 ready placeholders, or uploads a 5-second video file (D-8). Videos of another length are out of scope (ТЗ §8).
4. Before save, the form shows availability and planned shows. Planned shows per screen per day = slots per cycle × 60 × show hours inside the screen working hours. Example: 1 slot, 08:00–20:00 → 720 per screen per day; 3 screens → 2 160 per day (ТЗ §8, §14.5).
5. The check runs per screen × day × hour. A slot taken by one campaign cannot go to another campaign on the same screen in the same hour (ТЗ §8, §14.6, D-9).
6. If free slots are not enough, the form shows a clear message that names the screens and hours in conflict. The campaign is not saved (ТЗ §8).
7. No shows are planned outside the selected dates and hours (ТЗ §8).
8. After save, the campaign appears in the list and in «Расписание». It stays after a page refresh (ТЗ §8, §14.7).
9. A new campaign has 0 shows by the log until «Смоделировать показы» runs (ТЗ §12).

Notifications: None.

### 4.7 F-7: «Расписание»

Description: The section shows which ad runs on each screen and when (ТЗ §9).

Roles: R-1.

Acceptance criteria:

1. The user selects city, billboard and date (ТЗ §9).
2. The schedule shows hours. Opening an hour shows the 1-minute cycle with 12 slots (ТЗ §9).
3. Each slot shows its time inside the cycle (00–05 сек. … 55–60 сек.) and the campaign name or «Свободно» (ТЗ §9).
4. Occupied and free slots look different (ТЗ §9).
5. A campaign name links to the campaign card (ТЗ §9).
6. When campaigns overlap only part of the hours, each hour shows its own slot set (ТЗ §9).

Notifications: None.

### 4.8 F-8: «Аналитика аудитории»

Description: The section shows simulated audience analytics per screen and period (ТЗ §10). No cameras and no face recognition (ТЗ §10).

Roles: R-1.

Acceptance criteria:

1. For the selected period and screen it shows: estimated people in view; estimated vehicles (only for screens with that value, about half of screens, D-10); screen looks; look share among people with an estimated gaze direction; age groups 18–24, 25–34, 35–44, 45–54, 55+ (D-10); gender labelled «предположительно» (D-10); a chart of audience and looks per hour (ТЗ §10).
2. Age and gender carry the note that they are an algorithm estimate (ТЗ §10).
3. The section uses the terms «трафик», «взгляд на экран», «показ рекламы», «контакт с кампанией» as defined in §10 Glossary (ТЗ §10).
4. No photos of people, names or other personal data (ТЗ §10).
5. All values carry the demo label (ТЗ §10, §14.10).

Notifications: None.

### 4.9 F-9: «Отчёты» and print

Description: The section shows the report the owner gives to advertisers (ТЗ §11).

Roles: R-1 (R-2 receives it).

Acceptance criteria:

1. Filters: campaign, period, city, billboard (ТЗ §11).
2. The report shows: campaign name and advertiser; period; cities and screens; planned shows; shows by the demo log; plan completion %; estimated screen audience for the period; demo screen looks; a chart of shows per day; distribution per screen (ТЗ §11).
3. Plan completion % = shows by the log / planned shows × 100 (ТЗ §11).
4. The report has 2 separate blocks: «Результаты размещения» (plan and log) and «Аналитика экранов» (traffic and looks) (ТЗ §11, §14.9).
5. No label calls the screen audience a confirmed audience of the ad (ТЗ §11).
6. The report shows: «Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват» (ТЗ §11).
7. The «Печать / сохранить в PDF» button opens the browser print dialog. A print stylesheet hides the menu and filters (ТЗ §11, §14.11, D-12).
8. A seeded campaign with a test show log has a full report (ТЗ §14.8).

Notifications: None.

### 4.10 F-10: «Смоделировать показы» action

Description: An explicit action creates a simulated show log for a campaign (ТЗ §12).

Roles: R-1.

Acceptance criteria:

1. The campaign card has the button «Смоделировать показы».
2. The action creates log entries only for planned slots in the past part of the campaign period, on screens with status «онлайн».
3. Shows by the log never exceed planned shows.
4. The report and the dashboard show the new log values after the action.

Notifications: None.

### 4.11 F-11: Demo seed data

Description: Consistent synthetic data for all sections (ТЗ §13).

Roles: — (system).

Acceptance criteria:

1. Seed has 100 billboards in the 4 regions, some «офлайн», some with a camera (ТЗ §7, §13).
2. Most screens work 07:00–23:00; a few work 24/7 (D-2).
3. Seed has several advertisers and campaigns, schedules with occupied and free slots, a show log for at least 1 campaign, hourly audience analytics and several notifications (ТЗ §13).
4. Data agrees across sections: a slot shown as occupied in «Расписание» has the same campaign on the billboard card (ТЗ §13).
5. Seed has no real brands and no personal data (ТЗ §8, §10).

Notifications: None.

## 5. Constraints and non-functional requirements

| Item | Requirement | Source |
| --- | --- | --- |
| Hosting | Azure. Convex self-hosted (Docker on own VM). | Project `CLAUDE.md` |
| Personal data and data residency | No personal data in the demo: synthetic data only, no photos of people, no names. No residency rule given. | ТЗ §10, project `CLAUDE.md` |
| Backups (frequency, retention, storage, restore drill) | Demo: the seed and «Сбросить демо» restore the state. Convex export before each deploy. | D-13; TODO(client): backup needs for phase 2 (Q-02) |
| Performance (users, response time, volume) | Volume: 100 screens, 12 slots per minute cycle. Users and response time: not given. | ТЗ §7; TODO(client): expected users and response time for phase 2 (Q-03) |
| Availability | Demo must be available for the client meeting. No SLA given. | ТЗ §12 |
| Security (auth, sessions, passwords, audit log) | One shared demo password. No user accounts (ТЗ §4). No audit log. | ТЗ §4, D-13 |
| UI language | Russian. Currency: tenge. | ТЗ §3, §13 |
| Devices and platforms (browsers, screen widths, mobile OS) | Desktop browser, laptop screen. Mobile: not required. | ТЗ §3, §13 |

## 6. Integrations

| System | Purpose | Direction | Protocol | Personal data sent | Owner |
| --- | --- | --- | --- | --- | --- |
| OpenStreetMap tiles (via Leaflet) | Map of screens | Inbound (tiles) | HTTPS | None | OpenStreetMap; tile provider for commercial use: K-03 |

Real LED screens, players, cameras, computer vision, payments, report delivery and advertiser accounts are out of scope (§9).

### 6.1 Notification channels

| Channel | Provider | Used for | Phase |
| --- | --- | --- | --- |
| In-app list on «Главная» | Built in | «Экран недоступен», «Кампания скоро завершится» | 1 |

## 7. Acceptance

### 7.1 Procedure

The executor deploys the demo to the test stack on Azure. The executor and the client walk the scenario in §7.3 on a laptop browser with the seed data. The client confirms acceptance in writing. Deadline: 2026-10-31.

### 7.2 Criteria

The demo is accepted when ТЗ §14 criteria 1–11 pass:

1. The app opens in the browser. All sections work (F-1).
2. 100 billboards in the list. City and status filters work (F-3).
3. Billboard card with schedule and test analytics opens (F-4).
4. Campaign creation with screens, period, hours and slots works (F-6).
5. Planned shows are calculated from the selected values (F-6).
6. The system does not allow more than 12 slots on 1 screen at one time (F-6).
7. A saved campaign shows in the list and in the schedule and stays after a refresh (F-6).
8. A seeded campaign has a report with plan, test log and completion % (F-9).
9. Audience analytics is separate from campaign results (F-9).
10. All relevant sections and the report carry the demo label (F-1, F-8, F-9).
11. The report page prints or saves to PDF through the browser (F-9).

### 7.3 Acceptance scenario

| Step | Role | Action | Expected result |
| --- | --- | --- | --- |
| 1 | R-1 | Enter the shared password. Open «Главная». | The dashboard shows a network of 100 screens. |
| 2 | R-1 | Open «Билборды», filter by Astana, open a billboard card. | The list shows only Astana screens. The card opens. |
| 3 | R-1 | Look at occupancy, schedule and demo audience on the card. | Values show with «Демонстрационные данные». |
| 4 | R-1 | Create a new campaign on several screens. | The form accepts the values. |
| 5 | R-1 | Assign free slots. | The form shows availability and planned shows. |
| 6 | R-1 | Try to assign more slots than are free. | A clear message names the conflict. Save is blocked. |
| 7 | R-1 | Save the campaign. Refresh the page. | The campaign is in the list after the refresh. |
| 8 | R-1 | Open «Расписание» for a selected screen. | The new campaign shows in its slots. |
| 9 | R-1 | Open the report of a seeded campaign. | Plan, log, completion % and the 2 blocks show. |
| 10 | R-1 | Click «Печать / сохранить в PDF». | The browser print dialog opens with a clean report. |
| 11 | R-1 | Run «Смоделировать показы» on the new campaign. Open its report. | Shows by the log appear, not more than planned. |
| 12 | R-1 | Click «Сбросить демо» and confirm. | The seed data is back. The new campaign is gone. |

## 8. Assumptions, open questions and risks

### 8.1 Assumptions

Team decisions for the demo, approved by the user on 2026-10-28:

1. D-1: The cycle is 60 seconds with 12 slots of 5 seconds. Cycle length is one setting.
2. D-2: Test working hours: most screens 07:00–23:00, a few 24/7.
3. D-3: Occupancy % = occupied slots / all slots in working hours over the period × 100.
4. D-4: Estimated contacts = estimated traffic during the campaign shows × screen look rate (simulated).
5. D-5: «Кампания скоро завершится» fires 3 days before the end date.
6. D-6: Campaign statuses «Запланирована», «Активна», «Завершена» come from the dates.
7. D-7: Map with Leaflet + OpenStreetMap; the list works without the map.
8. D-8: Creative: 3–4 ready placeholders, or an optional 5-second video upload.
9. D-9: Slot conflict check per screen × day × hour, 12 slots.
10. D-10: Age groups 18–24, 25–34, 35–44, 45–54, 55+; gender «предположительно»; vehicles on about half of the screens.
11. D-11: No prices in the demo.
12. D-12: Report export by browser print only, with a print stylesheet.
13. D-13: One shared password; all viewers share data; «Сбросить демо» restores the seed.
14. The client legal name for documents is «BillBoard».

### 8.2 Open questions

| ID | Question | Section | Blocks | Owner |
| --- | --- | --- | --- | --- |
| Q-01 | TODO(client): content and deadline of phase 2. | 2.1 | Phase 2 planning | Client |
| Q-02 | TODO(client): backup needs for phase 2. | 5 | Phase 2 | Client |
| Q-03 | TODO(client): expected users and response time for phase 2. | 5 | Phase 2 | Client |
| Q-04 | TODO(client): the commercial slot model. The original request says «Суточная сетка каждой панели делится на 720 слотов». Confirm cycle length, working hours and how slots are sold. | 4.6, 8.1 D-1 | Phase 2 (demo uses D-1) | Client |
| Q-05 | TODO(client): prices in tenge for slots or campaigns. | 9 | Phase 2 | Client |
| Q-06 | TODO(client): confirm the formulas D-3 (occupancy) and D-4 (contacts). | 4.2 | Nothing in phase 1 (demo uses D-3, D-4) | Client |

### 8.3 Risks

| ID | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| K-01 | The deadline 2026-10-31 is 3 days from the SoW date for 11 features and a deploy. | Late or partial demo. | Build the §7.3 scenario first. Cut the map (D-7) and video upload (D-8) first if time is short. |
| K-02 | The client may read demo values as real results. | Wrong expectations. | Demo labels on every simulated value (F-1, F-9). Separate log from plan (F-2, F-9). |
| K-03 | OpenStreetMap tile usage policy limits heavy or commercial use. | Map may need another tile provider in phase 2. | Demo traffic is low. Choose a tile provider in phase 2. |
| K-04 | A shared password can leak. | Strangers see the demo. | No personal data in the demo. Change the password after the meeting. |
| K-05 | Self-hosted Convex on an Azure VM adds setup work inside the 3-day deadline. | Deploy delay. | Prepare the VM in parallel with the build. |

## 9. Out of scope

1. Connection to real LED screens and players (ТЗ §13).
2. Camera connection and computer vision; face identification and a face database (ТЗ §10, §13).
3. Payments, ad purchase and invoices (ТЗ §13).
4. Automatic report sending (ТЗ §13).
5. Real advertiser accounts, separate user accounts and permissions (ТЗ §4, §13).
6. Videos longer or shorter than 5 seconds (ТЗ §8).
7. Automatic PDF file generation (ТЗ §11, D-12).
8. Prices and billing in tenge (D-11, Q-05).
9. Mobile layout (ТЗ §3).

## 10. Glossary

### 10.1 Terms

| Term | Meaning |
| --- | --- |
| «билборд», «экран» | A digital billboard screen in the network. |
| «слот» | A 5-second place for one ad inside the 1-minute cycle. |
| «минутный цикл» | 60-second sequence of 12 slots that repeats in the working hours. |
| «режим работы» | The hours a screen plays ads. |
| «занятость рекламного инвентаря» | Share of occupied slots, % (D-3). |
| «запланированные показы» | Shows planned by the schedule. |
| «показы по журналу» | Shows recorded in the (demo) show log. |
| «процент выполнения плана» | Shows by the log / planned shows × 100. |
| «трафик» | Number of objects detected in the observation zone. |
| «взгляд на экран» | Estimate that a person looked toward the screen. |
| «показ рекламы» | Playback of a specific ad. |
| «контакт с кампанией» | Possible contact with a viewer during a show of a specific ad. |
| «Демонстрационные данные» | Label on simulated values. |
| «Смоделировать показы» | Explicit action that creates a simulated show log. |
| «Сбросить демо» | Action that restores the seed data. |

### 10.2 Statuses

| Status (verbatim) | Object | Meaning | Next statuses |
| --- | --- | --- | --- |
| «Запланирована» | Campaign | Start date is in the future. | «Активна» |
| «Активна» | Campaign | Today is inside the campaign period. | «Завершена» |
| «Завершена» | Campaign | End date is in the past (D-6). | — |
| «онлайн» | Screen | Screen works. | «офлайн» |
| «офлайн» | Screen | Screen does not work. Triggers «Экран недоступен». | «онлайн» |
| «Свободно» | Slot | No campaign in the slot. | Occupied (campaign name) |
