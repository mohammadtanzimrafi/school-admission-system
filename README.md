# School Admission System

First-come, first-served online admission for a school. Each class (one per shift) has a
fixed number of seats. Applying holds a seat for a limited time; paying the fee within that
time confirms the admission, otherwise the seat goes back to the pool.

| Part     | Stack                                                        |
| -------- | ------------------------------------------------------------ |
| Backend  | C# / .NET 10, ASP.NET Core minimal APIs, Npgsql (hand-written SQL) |
| Database | PostgreSQL 16                                                |
| Frontend | React 19, TypeScript, Vite, TanStack Query, Tailwind CSS     |
| Runtime  | Docker Compose                                               |

![Class list with live seat numbers](docs/screenshots/class-list.png)

## Run it

The only requirement is Docker.

```bash
docker compose up --build
```

| What     | URL                    |
| -------- | ---------------------- |
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:8080  |

The first build downloads the base images and packages, so it takes a few minutes. The
backend waits for PostgreSQL, creates the schema on first start, and is ready when
`http://localhost:8080/health` answers `{"status":"ok"}`.

Data lives in a named Docker volume, so `docker compose down` followed by
`docker compose up` keeps every class and application. (`docker compose down -v` deletes it.)

## Using the UI

1. **New class** (admin): create a class with a name and a seat count. Create one class per
   shift, e.g. "Class 6 - Morning Shift" and "Class 6 - Day Shift".
2. Type the student's 17-digit birth registration number in the box at the top. There is no
   login; this number identifies the student. It is remembered in the browser.
3. **Classes**: see total, on-hold, confirmed and available seats for each class (refreshed
   every 3 seconds) and press **Apply**.
4. **Application**: shows the status and a countdown. **Pay admission fee** confirms the
   admission (payment is simulated); **Cancel** releases the seat. When the time runs out
   the page switches to EXPIRED by itself and the pay button is disabled.
5. **My applications**: every application of this student with its current status.

The UI is in Bangla by default; the button in the header switches to English.

<p>
  <img src="docs/screenshots/application.png" alt="Application with countdown" width="62%">
  <img src="docs/screenshots/my-applications-mobile.png" alt="My applications on a phone" width="27%">
</p>

## Configuration

Everything is set through environment variables. With Docker Compose, copy `.env.example`
to `.env` and edit it, or pass values on the command line, for example
`HOLD_DURATION_SECONDS=30 docker compose up`.

| Variable                      | Used by  | Default                 | Meaning |
| ----------------------------- | -------- | ----------------------- | ------- |
| `ConnectionStrings__Database` | backend  | points at the `db` service | PostgreSQL connection string (Npgsql format). |
| `HOLD_DURATION_SECONDS`       | backend  | `600`                   | How long a seat stays held. |
| `HOLD_SWEEP_INTERVAL_SECONDS` | backend  | `30`                    | How often lapsed holds are marked EXPIRED in the database (housekeeping only). |
| `CORS_ALLOWED_ORIGINS`        | backend  | `*`                     | Comma-separated browser origins allowed to call the API. |
| `VITE_API_BASE_URL`           | frontend | `http://localhost:8080` | Backend URL the browser calls. Read when the container starts, so no rebuild is needed. Also honoured by `npm run dev` / `npm run build`. |
| `FRONTEND_PORT`               | compose  | `5173`                  | Host port for the frontend. |

## Tests

Both suites run in Docker, so nothing else needs to be installed.

```bash
# Backend: 28 integration tests against a real PostgreSQL (uses the compose database server)
docker compose --profile test run --rm --build backend-tests

# Frontend: 42 unit and screen tests
docker compose --profile test run --rm --build frontend-tests
```

The backend tests start the real API in-process on a random port and talk to it over HTTP.
Each test class creates its own throwaway database and drops it afterwards, so they never
touch application data. They cover:

- the full lifecycle of all eight endpoints, including validation and error codes;
- **concurrency**: 200 simultaneous applicants for 10 seats get exactly 10 holds; the same
  with 300 applicants spread over **two API instances** sharing one database; 30 parallel
  applications by one student give one hold; 30 parallel confirms count one seat; confirm
  racing cancel leaves exactly one winner; a churn test watches the seat numbers the whole
  time applicants apply, pay and cancel;
- expiry with a 2-second hold: the seat returns with no API call, an expired hold cannot be
  confirmed, and the student can apply again;
- data surviving a backend restart.

Running them without Docker:

```bash
# Backend (needs .NET 10 SDK and a PostgreSQL server)
cd backend
TEST_DATABASE_CONNECTION="Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres" dotnet test

# Frontend (needs Node 22+)
cd frontend
npm ci
npm test
```

## Two backends on one database (bonus)

```bash
docker compose --profile two-backends up --build
```

This adds a second backend process on http://localhost:8081 using the same database. Seat
limits still hold because they are enforced inside PostgreSQL, not in application memory;
`ASSUMPTIONS.md` explains how, and `ConcurrencyTests` proves it.

## API

Base URL `http://localhost:8080`, JSON in and out. The student is identified by the
`X-Student-Id` header (17 digits).

| # | Method and path               | Purpose                              | Success |
| - | ----------------------------- | ------------------------------------ | ------- |
| 1 | `POST /classes`               | Create a class                       | 201     |
| 2 | `GET /classes`                | All classes with seat numbers        | 200     |
| 3 | `GET /classes/{classId}`      | One class with seat numbers          | 200     |
| 4 | `POST /classes/{classId}/holds` | Apply (hold a seat)                | 201     |
| 5 | `GET /holds/{holdId}`         | Current state of an application      | 200     |
| 6 | `POST /holds/{holdId}/confirm` | Pay the fee, confirm the admission  | 200     |
| 7 | `DELETE /holds/{holdId}`      | Cancel an application                | 204     |
| 8 | `GET /me/holds`               | All applications of this student     | 200     |

Responses contain every field of the contract, plus a few extras (`className`,
`remainingSeconds`, seat numbers on `POST /classes`).

Errors are RFC 9457 problem documents with a stable machine-readable `code`:

```json
{ "status": 409, "title": "Conflict", "code": "CLASS_FULL", "detail": "No seats are available in this class right now." }
```

| Status | `code`                                                             |
| ------ | ------------------------------------------------------------------ |
| 400    | `VALIDATION_FAILED`, `INVALID_REQUEST`, `STUDENT_ID_REQUIRED`, `STUDENT_ID_INVALID` |
| 403    | `NOT_HOLD_OWNER`                                                   |
| 404    | `CLASS_NOT_FOUND`, `HOLD_NOT_FOUND`                                |
| 409    | `CLASS_FULL`, `ALREADY_APPLIED`, `HOLD_EXPIRED`, `HOLD_CANCELLED`, `HOLD_ALREADY_CONFIRMED` |
| 503    | `SERVICE_UNAVAILABLE` (database unreachable)                       |

## How the seat limit is kept

`held + confirmed` can never exceed `totalSeats`:

1. Seat numbers are never stored. They are counted from the `holds` table, where a hold
   occupies a seat while it is `CONFIRMED`, or `HELD` and not yet past `expires_at`.
2. Placing a hold runs in one transaction that locks the class row
   (`SELECT ... FOR NO KEY UPDATE`), counts the occupied seats under that lock, and inserts
   the hold before releasing it. Two requests can therefore never both take the last seat,
   whichever backend process they reach.
3. A partial unique index allows one seat-occupying hold per student per class.
4. Confirm and cancel are single `UPDATE ... WHERE status = 'HELD' AND expires_at > now`
   statements, so a repeated or concurrent call changes nothing the second time.
5. Expiry needs no job: once `expires_at` passes, the hold simply stops being counted. A
   background sweeper only writes the `EXPIRED` status down afterwards.

The SQL is in `backend/src/SchoolAdmission.Api/Data/HoldRepository.cs` and the schema in
`backend/src/SchoolAdmission.Api/Data/Migrations/V001__initial_schema.sql`.

## Project layout

```
docker-compose.yml
backend/
  Dockerfile
  src/SchoolAdmission.Api/
    Program.cs, AdmissionApp.cs    entry point and composition root
    Configuration/                 environment settings, validated at startup
    Domain/                        StudentId, Hold, ClassSeats, HoldStatus
    Data/                          SQL migrations, repositories, migration runner
    Features/Classes, Features/Holds   endpoints, services, response contracts
    Http/                          error catalogue, problem responses, identity header
  tests/SchoolAdmission.Api.Tests/ integration tests
frontend/
  Dockerfile, nginx/               static build served by nginx
  src/
    api/                           fetch wrapper, endpoint functions, query hooks
    pages/                         the four screens
    components/, student/, i18n/, hooks/, lib/
```

## Local development without Docker

Needs the .NET 10 SDK, Node 22+ and a PostgreSQL server. By default the backend expects
PostgreSQL on `localhost:5432` with user and password `postgres` and a database named
`school_admission`; set `ConnectionStrings__Database` to use anything else.

```bash
# Backend on http://localhost:8080
cd backend/src/SchoolAdmission.Api
dotnet run

# Frontend on http://localhost:5173 (reads VITE_API_BASE_URL, see frontend/.env.example)
cd frontend
npm install
npm run dev
```

See `ASSUMPTIONS.md` for the decisions taken where the brief was silent, and `AI_USAGE.md`
for how AI was used.
