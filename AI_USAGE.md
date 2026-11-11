# AI usage

## Tool

Claude (Anthropic), used as a coding agent in the Claude desktop app. It worked in its own
Linux sandbox with PostgreSQL 16, the .NET 10 SDK, Node 22 and a headless browser.

## Where it was used

Nearly everywhere: the design, the backend, the frontend, the automated tests, the Docker
setup and the first draft of these documents were produced with Claude from the assignment
brief. The commit history shows the order in which it was built.

## Where the AI was wrong, and how it was caught

| What went wrong | How it was caught | Fix |
| --------------- | ----------------- | --- |
| The first plan used EF Core. The sandbox could not download NuGet packages, so EF migrations could not be generated or checked. | Package restore failed at the very first step. | Switched to hand-written SQL migrations and plain ADO.NET on Npgsql, which is also easier to review for locking. |
| The concurrency tests could have been passing for the wrong reason. | Deliberately removed `FOR NO KEY UPDATE` and re-ran them. | They failed as they should (20 holds for 10 seats), then the lock was restored. The tests are trusted because they have been seen to fail. |
| Startup retry only treated "no SQLSTATE" as "database not ready", missing PostgreSQL's `57P03` ("the database system is starting up"). | Reading the retry code again before running it. | Added `57P03` and socket/timeout errors to the "unavailable" check. |
| A frontend test for "pay the fee" expected CONFIRMED, but the mocked server still answered HELD on the refetch that follows a payment. | The test failed. | The mock now behaves like the server: after a confirm it returns the confirmed hold. |
| Opening an application while the server was down showed "could not load", although the list already had that application. | Browser test with the backend stopped. | The application page now starts from the cached copy and keeps it on screen while offline. |
| The "application in progress" banner repeated the countdown twice and also appeared on the screen that already lists the application. | Looking at screenshots. | Text shortened; banner hidden on those screens. |
| A countdown hook reset its own state inside an effect (flagged by the linter), and each countdown had its own timer. | Lint warning. | Replaced with one shared clock that every countdown reads. |
| Backend work was first committed as one large commit. | Reviewing `git log`. | Split into logical commits before continuing. |

## What the AI could not check itself

Its sandbox blocks NuGet and Docker registries, so two things were **not** executed there:

- **the real Npgsql driver and xUnit.** The backend and its 28 tests were run against a real
  PostgreSQL through a small local stand-in that implements the same standard ADO.NET
  interfaces (`DbDataSource`, `DbCommand`, ...). The application code only uses those
  standard interfaces, plus `NpgsqlDataSource.Create`, to keep that gap as small as possible;
- **`docker compose up`.** The compose file was validated with `docker compose config`, the
  nginx configuration was run locally against the production build, and the build commands
  from both Dockerfiles were run from a clean checkout, but no image was built.

Everything else was executed: all eight endpoints by hand and by test, 3,000 simultaneous
applicants across two real backend processes (exactly 120 holds for 120 seats), the 42
frontend tests, and the UI in a real browser on desktop and phone sizes, including expiry
without reload, a refresh, reopening the browser, and the server going down and coming back.

These must therefore be run on a machine with Docker before relying on the result:

```bash
docker compose up --build
docker compose --profile test run --rm --build backend-tests
docker compose --profile test run --rm --build frontend-tests
```
