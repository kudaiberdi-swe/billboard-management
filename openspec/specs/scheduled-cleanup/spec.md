# scheduled-cleanup Specification

## Purpose
Daily server jobs that keep the demo tables and file storage from growing without bound: expired demo sessions, old rate-limit rows and orphan video uploads (security audit KI-03, KI-06). No viewer calls them; they run on the Convex cron schedule.

## Requirements

### Requirement: Daily job schedule
The backend SHALL run 3 daily jobs (times in UTC; UTC+5 is 5 hours later): the orphan upload sweep at 21:00, the expired session purge at 21:10, and the old rate-limit row cleanup at 21:20. The jobs are internal. No public function and no client can call them.

#### Scenario: three daily jobs are registered
- **WHEN** the cron table of the deployment is read
- **THEN** it holds the daily jobs «sweep orphan uploads» at 21:00 UTC, «purge expired sessions» at 21:10 UTC and «clear old rate-limit rows» at 21:20 UTC

### Requirement: Expired sessions are purged
The session purge SHALL delete every demo session whose expiry is at or before the run start, and keep every other session. It SHALL walk the sessions in pages of 500 and schedule the next page until the end of the table. The run start time stays fixed for all pages.

#### Scenario: purge deletes only expired sessions
- **WHEN** the purge runs over more than 500 sessions, half of them expired
- **THEN** every expired session is deleted
- **AND** every session with an expiry after the run start is kept and still valid

### Requirement: Old rate-limit rows are cleared
The rate-limit cleanup SHALL delete rate-limiter rows created more than 1 hour before the run, and keep newer rows. Every rate limit refills in under 1 hour, so a deleted idle row acts like a fresh one.

#### Scenario: cleanup drops rows older than one hour
- **WHEN** the cleanup runs with 1 rate-limit row created 2 hours ago and 1 created 10 minutes ago
- **THEN** the old row is gone
- **AND** the recent row is kept

### Requirement: Orphan uploads are swept page by page
The sweep SHALL delete stored files older than 24 hours that no campaign uses as its video creative. It SHALL walk the old files in pages of 500, skip referenced files without counting them as deleted, and schedule the next page until the end, at most 40 pages per daily run. Files younger than 24 hours and files used by a campaign SHALL stay.

#### Scenario: sweep pages past referenced files
- **WHEN** the oldest 500 stored files include files used by campaigns, more orphan files older than 24 hours follow them, and 1 orphan file is younger than 24 hours
- **THEN** the first page deletes its orphans only, and the scheduled pages delete the later old orphans
- **AND** after the run only the referenced files and the young file remain
