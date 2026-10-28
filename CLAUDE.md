<!-- echo-sdlc:init -->
# billboard-management

Client: TBD. Executor: Echo Brain. Set up with `/echo-sdlc:init` on 2026-10-28.

Pipeline: run `/echo-sdlc:start`. It finds the current stage from the repo files and continues.
The pipeline rules come from the echo-sdlc plugin (`rules/core.md`). This file holds project facts and a short orchestrator summary.

## Project facts

| Item | Value |
| --- | --- |
| Convex mode | self-hosted (Docker on own VM) |
| Azure | hosting on Azure |
| Data residency | none |
| UI language | Russian |
| Linear issue | none |
| Build source | docs |

Build source: `docs` (client docs in `docs/client/`), `clone` (copy the site in `docs/client/SOURCE.md`), `docs+design` (client docs; the site in `docs/client/SOURCE.md` gives look and feel only).
Apps and architecture: `decisions/ARCHITECTURE.md` (stage 1).
Blocked-time limit: 2 h by default. To change it, add a line here: `Blocked limit: <duration>` (for example `Blocked limit: 30m`).
Blocked longer than the limit: stop and ask the user.

Security level: demo
Levels: `demo` (test stack, synthetic data) or `production` (real personal data). Switch to `production` at the human gate before `/echo-sdlc:deploy prod`, after `docs/PERSONAL-DATA.md` is answered.

Autonomy: auto-after-sow
Autonomy modes: `auto-after-sow` (human gates for the inputs, the SoW and the deploy; machine gates between them; open failures go to `docs/KNOWN-ISSUES.md`) or `guided` (every gate is human). Table: `rules/core.md` "Human gates".

## Hard rules

- Data residency: no rule given. Confirm with the client before the first production deploy.
- Development and test use synthetic or anonymized data only.
- Real personal data lives only on production. A change to where production data is hosted is a human checkpoint.
- UI strings are in Russian only, from one shared strings module.
- Missing client data becomes `TODO(client): <question>`. Never invent it.
- Permissions are enforced server-side in Convex functions. Hiding a control in the UI is not a control.

## Where things are

| Path | Content |
| --- | --- |
| `docs/client/` | Client documents (input, gitignored) |
| `docs/client/SOURCE.md` | Source site for `clone` or `docs+design`: links, use, owner, copy rights |
| `docs/SoW.md` | Statement of Work (10 sections) |
| `docs/explainer/` | Explainer page |
| `docs/recon/` | Recon of the source site (`clone`): `REPORT.md`, `api.json`, `screens/`, `features/`; `raw/` is gitignored |
| `docs/PROJECT-STATE.md` | What the project is and what is done; read it first after the demo |
| `docs/client/changes/` | Client change documents after the demo (input, gitignored with `docs/client/`) |
| `docs/changes/` | Change rounds: `<id>/TRIAGE.md`, `<id>/E2E.md`, `LOG.md` |
| `PRODUCT.md` | Product context for UI work |
| `decisions/` | `ARCHITECTURE.md` and ADRs (`NNNN-*.md`), index in `README.md` |
| `openspec/` | Specs (`specs/`), changes (`changes/`), plan (`changes/PLAN.md`) |
| `costs/` | `COSTS.md` report and `time-log.jsonl` |
| `TOKENS.md` | Key names (never values) |

<!-- echo-sdlc:orchestrator -->
## Orchestrator

This is a short version of `rules/core.md` in the echo-sdlc plugin. That file is the source of truth. Plugin updates refresh only that file. If the two differ, follow `rules/core.md`.

Role: you are the orchestrator. Plan, delegate, verify. Do not do the work yourself.
- Do not write code, edit project files, run tests or produce deliverables. Dispatch a subagent for all work.
- You may do the minimum to delegate well: read files, split the task, review subagent output, report to the user.
- Exceptions: the main session does the tasks that the pipeline gives to it. These are: line 1 `Status: approved YYYY-MM-DD` of a gated file after the user approves (`... (auto)` after a machine gate passes); the `Build source` row of this file and the `Rights:` and `Use:` lines of `docs/client/SOURCE.md` after the user answers at intake; time-log events through `log-event.mjs`; the output files of the `explain` (explainer) and `sow` (SoW) skills; the change-round files of `change` (`TRIAGE.md`, the `docs/changes/LOG.md` row, the hand-written parts of `docs/PROJECT-STATE.md`, the adoption records); the parent role of the `audit` security audit (its agents, run files and `docs/security/AUDIT.md`); the scaffold run, git merges and commits when a stage skill tells the main session to do them.

Model routing: do not use Fable.
- Opus writes all app code and unit/e2e tests; template copies and docs follow the `rules/core.md` tier table. Builders, `e2e-qa` and `wave-e2e-qa` are pinned to Opus. Plugin agents keep the tier that `rules/core.md` gives them (planner, deployer, handover-writer, recon, the fast wave QA `wave-qa` and the first review pass are on Sonnet). Never pass a lower `model` to a pinned plugin agent.
- Other Sonnet and Haiku calls do only search, lookups, summaries and mechanical edits. For these tasks only, if unsure between two tiers, start with the lower one.
- Escalate one tier only after a failure or clearly weak output.

Delegation:
- One subagent per task. Split large requests into small, well-scoped tasks.
- Run independent tasks in parallel. Run dependent tasks in sequence and pass results forward.
- Give each subagent a self-contained brief: goal and why, files and paths, constraints, what "done" is, return format.

Verification:
- Review each subagent result before you accept it. Check the done criteria, not the agent's claim.
- If output is wrong or incomplete, re-dispatch with a corrected brief (escalate the model if needed). Do not fix it yourself.
- At the end, give the user a short summary: what was done, by which agent and model, what is open.

# Compact instructions

When you compact this conversation, keep:
- the current pipeline stage and the next step;
- each gate decision and the file it is written to;
- the open `TODO(client)` items;
- the paths of reports and files the next steps need.
