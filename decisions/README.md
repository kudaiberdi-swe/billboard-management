# Decisions

Architecture overview: [ARCHITECTURE.md](ARCHITECTURE.md). One ADR per material decision, file `NNNN-short-title.md`, made from the echo-sdlc `adr.md` template.

Rules:

- A new ADR starts as **Proposed**. It becomes **Accepted** only when the user confirms it.
- Do not change the decision in an **Accepted** ADR. Write a new ADR that supersedes it. Set the old one to **Superseded** and link both ways.
- Add every ADR to the index below in the same commit.

## Index

| # | Title | Status | Date | Decided by |
| --- | --- | --- | --- | --- |
| [0001](0001-app-split-and-frontend-stack.md) | App split and frontend stack | Proposed | 2026-10-28 | architect agent (draft) |
| [0002](0002-repo-layout-and-shared-code.md) | Repo layout and shared code | Proposed | 2026-10-28 | architect agent (draft) |
| [0003](0003-demo-access-shared-password.md) | Demo access with one shared password | Proposed | 2026-10-28 | architect agent (draft) |
| [0004](0004-data-model-and-slot-occupancy.md) | Data model and slot occupancy | Proposed | 2026-10-28 | architect agent (draft) |
| [0005](0005-simulated-audience-analytics.md) | Simulated audience analytics | Proposed | 2026-10-28 | architect agent (draft) |
| [0006](0006-seed-and-demo-reset.md) | Seed data and «Сбросить демо» | Proposed | 2026-10-28 | architect agent (draft) |
| [0007](0007-simulated-show-log.md) | «Смоделировать показы» show log | Proposed | 2026-10-28 | architect agent (draft) |
| [0008](0008-creatives-and-file-storage.md) | Creatives and file storage | Proposed | 2026-10-28 | architect agent (draft) |
| [0009](0009-map-leaflet-osm.md) | Map of screens with Leaflet and OpenStreetMap | Proposed | 2026-10-28 | architect agent (draft) |
| [0010](0010-report-print.md) | Report print with a print stylesheet | Proposed | 2026-10-28 | architect agent (draft) |
| [0011](0011-environments-hosting-backups.md) | Environments, hosting, backups and test stack | Superseded by 0012 | 2026-10-28 | architect agent (draft), machine gate (auto) |
| [0012](0012-hosting-convex-cloud-vercel-ci.md) | Hosting on Convex Cloud (EU) and Vercel, deploy by GitHub Actions | Accepted | 2026-10-29 | User decision, 2026-10-29 |
