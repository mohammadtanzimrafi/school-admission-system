# AI usage

## Tool

Claude (Anthropic), used as a coding agent in the Claude desktop app. The first pass ran in
its own Linux sandbox with PostgreSQL 16, the .NET 10 SDK, Node 22 and a headless browser.
A second pass ran on my Windows machine with the real .NET 10 SDK, PostgreSQL 16.15 and
Node 24, and checked the whole app against the brief again.

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
| Running the backend against a plain PostgreSQL server crashed on startup (`3D000`, database does not exist). Docker Compose had hidden it, because `POSTGRES_DB` creates the database. | First `dotnet run` on the second machine. | The migrator now creates the database when it is missing. |
| The "total seats" label sat beside its input instead of above it. | Clicking through the admin screen. | Labels made block-level. |
| On a 375px phone the nav tabs overflowed and cut off the admin tag. | Phone-size browser check. | Tabs share the width; the tag shows from `sm` upward. |
| The green "Live" badge kept pulsing while the red banner said the server was unreachable. | Stopping the backend with the class list open. | The badge switches to "Reconnecting"; a test covers it. |
| The frontend image used `node:22-slim`, but `jsdom` and `react-router` need Node 22.22 or newer, which a floating tag does not promise. | Reading the `engines` field of each dependency. | Pinned to `node:24-slim`, the Node version everything was tested on. |

## What was checked, and what was not

The first sandbox could not reach NuGet, so the backend there ran on a stand-in for the
Npgsql driver. That gap is closed: on the second machine the 28 backend tests pass using the
real Npgsql 10 driver and xUnit against PostgreSQL 16.15, including the concurrency tests
(200 applicants for 10 seats get exactly 10 holds; 300 applicants across two API instances
cannot oversell 15 seats).

The UI was then used end to end in a browser against that backend and database: creating
classes (with Bangla digits), invalid input, applying, a 60-second hold expiring on screen
without a reload, paying, cancelling, "My applications", a refresh, a class filling up, the
backend being stopped and restarted (data kept), and a phone-size screen. The 43 frontend
tests, the linter and the production build pass. Every API error case was also called
directly: none returned a 500.

**`docker compose up` has not been run by the AI on either machine**, because neither had
Docker. The compose file was validated with `docker compose config` and the nginx config was
exercised in the first pass, and every command inside the Dockerfiles has been run by hand,
but no image was built. Run these on a machine with Docker before relying on the result:

```bash
docker compose up --build
docker compose --profile test run --rm --build backend-tests
docker compose --profile test run --rm --build frontend-tests
```
