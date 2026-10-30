Status: approved 2026-10-30

# Change round c01-kpi-align

Round: c01-kpi-align
Input: docs/client/changes/2026-10-30-kpi-align-feedback.png
Started: 2026-10-30
Deployed: -

One row per item of the input. Facts only from the input, the specs and the code; an unclear item gets a question, never a guess.

- Type: `bug` (the app does not do what its spec says), `change` (an existing feature must work differently), `new` (a feature no spec has), `out of scope` (outside the SoW; the PM decides).
- Size: `S` (text, style or a one-file fix), `M` (one capability, a few files, inside the contract), `L` (a new capability or screen flow, or a contract change).
- Contract: `no`, or `yes: <what changes in the locked contract, smallest option>`.
- Decision: `pending` until the gate, then `do`, `drop` or `quote` (priced separately, not in this round).

## Items

| # | Item | Source | Type | Capability | Code paths | Contract | Size | Decision | Question |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Выровнять цифры в KPI-карточках «Главная» по нижнему краю: сейчас цифры скачут по высоте, т.к. часть подписей в 2 строки | screenshot 2026-10-30 (sales team via PM), msg 16:44 | change | `dashboard` (Requirement: Network value cards, spec.md:8) | `src/routes/home/Cards.tsx:49` (Stack: add `h="100%" justify="space-between"`, same as `src/routes/analytics/Blocks.tsx:50`) | no | S | do | - |

## Changes

Filled after the gate: the OpenSpec changes of this round and the items each one covers.

| Change | Items | Kind |
| --- | --- | --- |
| c01-kpi-align | #1 | delta |
