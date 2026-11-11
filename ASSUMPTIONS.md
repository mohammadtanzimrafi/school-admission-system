# Assumptions

Where the brief was silent, this is what was assumed and why.

## Identity and input

| # | Assumption | Why |
| - | ---------- | --- |
| 1 | `X-Student-Id` must be exactly 17 ASCII digits; a missing or malformed value is `400`. | The brief defines the value as a 17-digit birth registration number. Since it is the only identity, accepting anything else would create applications nobody can find again. The UI also accepts Bangla digits and converts them. |
| 2 | Class names need not be unique; `totalSeats` must be 1 to 100,000 and the name 1 to 100 characters. | The id identifies a class. Rejecting a repeated name would block legitimate re-creation and adds nothing. A class with no seats is a typing mistake. |
| 3 | Anyone can create a class. | The brief says no login, so there is nothing to check an admin against. The screen is labelled "Admin". |

## Application rules

| # | Assumption | Why |
| - | ---------- | --- |
| 4 | A student may have one active application (HELD or CONFIRMED) **per class**, but may apply to several classes. | That is what the rule says ("in one class"). A guardian may reasonably try both shifts. |
| 5 | Applying again to the same class returns `409 ALREADY_APPLIED` (with the existing `holdId`), not the existing hold with `201`. | The request did not create anything; saying so is more honest, and the UI uses the id to open the existing application. |
| 6 | After a hold is cancelled or expires, the same student may apply to that class again. | The seat is free and the student has no active application. |
| 7 | Confirming an already confirmed hold returns `200` again; confirming an expired or cancelled one is `409`. | Required: repeated confirms must count once. Idempotent success is the friendliest answer to a double click or a retried request. |
| 8 | Only a HELD, unexpired hold can be cancelled. Cancelling again returns `204`; cancelling a CONFIRMED admission is `409`. | Undoing a paid admission implies a refund, which is outside the brief. Repeating a DELETE should be harmless. |
| 9 | Someone else's hold answers `403`; an unknown or malformed id answers `404`. | `GET /holds/{id}` is readable without identity, so existence is not secret. |
| 10 | `GET /holds/{id}` needs no header and does not return `studentId`. | The contract lists no header for it. As it is open to anyone who knows the id, it should not reveal a birth registration number. Ids are random UUIDs, so they cannot be guessed. |

## Time and expiry

| # | Assumption | Why |
| - | ---------- | --- |
| 11 | The database clock is the only clock. | With several backend processes, their own clocks may disagree; PostgreSQL's cannot disagree with itself. |
| 12 | A seat is free the instant `expires_at` passes, with no job involved. | Every seat count compares `expires_at` with the current time, so "no API call needed" holds exactly, not "within the next sweep". The sweeper only records `EXPIRED` in the table afterwards. |
| 13 | `expiresAt` is ISO 8601 UTC with milliseconds (`2026-11-01T04:10:00.000Z`). | The hold lasts exactly `HOLD_DURATION_SECONDS`; rounding to whole seconds would make the reported time differ from the real one. |
| 14 | Responses add `remainingSeconds` (and `className`). | The countdown is driven by server-measured remaining time, so a phone with a wrong clock still shows the right countdown. Extra fields are allowed by the brief. |

## Technology

| # | Assumption | Why |
| - | ---------- | --- |
| 15 | .NET 10. | The brief allows 8 or newer; 10 is the current LTS release. |
| 16 | Hand-written SQL on Npgsql instead of a full ORM; schema changes are plain SQL migration files applied at startup. | There are about ten queries and the important ones are about locking. Keeping the SQL visible makes the concurrency behaviour reviewable line by line. |
| 17 | CORS allows any origin by default (`CORS_ALLOWED_ORIGINS` narrows it). | The API has no cookies or sessions, and the frontend URL is configurable. |
| 18 | The UI polls (classes every 3 s, an open application every 4 s) instead of using WebSockets. | "Every few seconds" is the requirement; polling is simpler and survives restarts and proxies. |
| 19 | The student id is kept in `localStorage`. | Needed so a refresh, or closing and reopening the browser, still shows the running application. |

## Bonus: two backend processes, one database

The limit is enforced by PostgreSQL, so it does not matter how many processes there are:

- placing a hold locks the class row (`FOR NO KEY UPDATE`), counts taken seats under the lock
  and inserts before commit, so all processes queue on the same row;
- a partial unique index guarantees one active hold per student per class;
- confirm and cancel are single guarded `UPDATE` statements;
- the backend keeps no seat state in memory, and migrations take an advisory lock so two
  processes starting together do not both create the schema;
- the sweeper uses `FOR UPDATE SKIP LOCKED`, so two sweepers never block each other.

Proof: `ConcurrencyTests.Two_backend_instances_sharing_one_database_never_oversell` sends
300 simultaneous applicants across two API instances for 15 seats and expects exactly 15
holds. To try it by hand: `docker compose --profile two-backends up --build` (ports 8080
and 8081).
