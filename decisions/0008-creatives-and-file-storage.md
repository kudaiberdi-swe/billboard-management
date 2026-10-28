# 0008. Creatives and file storage

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

D-8: the user picks 1 of 3–4 ready placeholders, or uploads a 5-second video. Other lengths are out of scope (SoW §9.6). Screens show a photo or a demo image (F-3 AC2). No photos of people (ТЗ §10). K-01: cut the video upload first if time is short. Self-hosted Convex keeps files in its Docker volume by default, or in S3 (self-hosted README, verified 2026-10-28).

## Options

1. **Placeholders and screen images as static files in `public/demo/`; video upload to Convex file storage**: upload URL from a guarded mutation, browser uploads, the campaign stores `storageId`. Pros: built into Convex, no new service; files go into the Convex export with `--include-file-storage` (CLI docs, verified 2026-10-28). Cons: duration cannot be read on the server without a media library.
2. **Azure Blob Storage for uploads**: Pros: scalable. Cons: another service and keys; not needed for a demo.
3. **No upload, placeholders only**: Pros: least work. Cons: drops part of D-8.

## Decision

Option 1.

- `campaigns.generateUploadUrl({ sessionId })` (guarded) returns an upload URL. After upload, `campaigns.create` receives `storageId` and checks the file in `_storage` system metadata: content type `video/mp4` or `video/webm`, size ≤ 20 MB; otherwise it deletes the file and rejects.
- The 5-second check runs in the browser before upload (`<video>` metadata `duration` within 4.5–5.5 s). shortcut: the server does not verify duration; add a server check with a media probe if uploads ever come from outside the demo.
- Placeholders: 3–4 static images (for example abstract «Demo» posters) in `public/demo/creatives/`; screen images: a few generic billboard illustrations without people in `public/demo/screens/`, assigned by `imageKey`.
- Reset deletes uploaded videos (ADR-0006).

## Consequences

- Uploaded files live on the Convex volume of whatever stack runs (local disk now, Azure VM disk later); back them up with the export (ADR-0011).
- Images must be made or picked by the team, with a free licence and no people. TODO(team): pick or draw the images.
- If time runs short, ship placeholders only and hide nothing else; the form keeps the placeholder path (K-01).

## Open questions

None.
