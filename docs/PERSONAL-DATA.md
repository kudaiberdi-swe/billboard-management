# Personal data: questions before production

Source: Law of the Republic of Kazakhstan No. 94-V "On personal data and their protection" (consolidated text).
This file records questions and the team's answers. It is not legal advice and does not state that the product complies with the law.
The client and their lawyer decide the answers. Echo records who answered and when.

`/echo-sdlc:deploy prod` stops while a row has no answer, no name or no date
(`check-security.mjs --only pd --level production`). Write `none` where a question does not apply, and still sign the row.
The law changed several times in 2025-2026: check the current text before each production release.

Phase 1 (demo, security level `demo`): the documents state that the demo holds no personal data. ТЗ §10: «Не использовать фотографии людей, имена и другие персональные сведения в демо»; for demo «без установления личности и без базы лиц». SoW §5, F-8 AC4, F-11 AC5: synthetic data only, no photos of people, no names. Audience analytics are simulated aggregates (ADR-0005). The shared demo password is not personal data (ADR-0003). The answers below cover only what the documents state; production answers are `TODO(client)` and need the client's signature.

| # | Question | Answer | Answered by | Date |
|---|---|---|---|---|
| 1 | Which personal data does the product store (IIN, phone, email, address, birth date, documents, health, biometrics)? Which fields hold it? | Demo: none (ТЗ §10, SoW §5). No user accounts (SoW §3). Production: TODO(client): phase 2 scope (Q-01); real cameras and computer vision (out of scope in phase 1, SoW §9.2) may process images of people. | | |
| 2 | Where is the production database with personal data (country, provider, region)? Art. 12(2) asks for storage in a database on the territory of Kazakhstan. Who confirmed the location? | Demo: no personal data; stack runs locally, later on an Azure VM, region open (OQ-2). Production: TODO(client): location of any personal data; project `CLAUDE.md` gives no residency rule ("Data residency \| none"), confirm before the first production deploy. | | |
| 3 | Does personal data leave Kazakhstan (Convex Cloud region, Azure region, email, SMS, CAPTCHA, analytics or model providers)? To which states, and on which ground (Art. 16)? | Demo: none sent. Only external service: OpenStreetMap tiles, no personal data sent (SoW §6). Production: TODO(client). | | |
| 4 | How does a person give consent, and how is it proven (Art. 8(1), Art. 25)? Channel, stored record, text version. Who writes the consent text? | Demo: none (no personal data collected). Production: TODO(client). | | |
| 5 | Does the consent text state what Art. 8(4) asks for (operator, purpose, term, third parties, cross-border transfer, public distribution)? Who checked it? | Demo: none. Production: TODO(client). | | |
| 6 | Is consent recorded before the first write of personal data (sign-up, OTP sign-in, checkout)? | Demo: none (no sign-up; one shared password, D-13). Production: TODO(client). | | |
| 7 | How does a person withdraw consent, and who stops the processing within the term the law sets (Art. 8(7))? | Demo: none. Production: TODO(client). | | |
| 8 | Who is the contact for a personal-data breach, and what is the notification procedure (Art. 25; breach register, Art. 23-2)? | Demo: none. Production: TODO(client): breach contact and procedure. | | |
| 9 | Who reviewed the 2025-2026 amendments (Art. 10-1, 19-1, 25-1) for this product, and what did they conclude? | TODO(client): review by the client's lawyer before production. | | |
