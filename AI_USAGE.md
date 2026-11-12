# AI usage

## Tool

Claude (Anthropic), as a coding agent in the Claude desktop app.

## Where I used it

Claude wrote most of the code from the assignment brief: the backend, the frontend, the
tests, the Docker setup and the first drafts of these documents. I gave it the brief and
directed the work over several sessions. The final look comes from a Figma design: Claude
read it through the Figma connector and rebuilt the screens to match. The commit history shows
the order things were built in.

## Where it went wrong, and how that was caught

| Problem | How it was caught | Fix |
| ------- | ----------------- | --- |
| The first plan used EF Core, but the AI's sandbox could not download NuGet packages. | Package restore failed. | Switched to plain SQL on Npgsql, which also keeps the locking easy to review. |
| The concurrency tests might have been passing for the wrong reason. | The row lock was removed on purpose and the tests re-run. | They failed (20 holds for 10 seats), so they can be trusted. Lock put back. |
| Startup retry missed PostgreSQL's "database is starting up" error (`57P03`). | Code review. | Added to the retry check. |
| Opening an application while the server was down showed an error, although the data was already cached. | Testing with the backend stopped. | The page now shows the cached copy. |
| On a plain PostgreSQL server the backend crashed on first start, because the database did not exist. Docker had hidden this. | First run on my machine. | It now creates the database if it is missing. |
| The "Live" badge kept pulsing while the server was down; a form label sat beside its input; the menu overflowed on phones. | Clicking through the app on desktop and phone size. | All three fixed. |
| Some copy read wrong after the redesign: "Seat held for 1 minutes", and "সপ্তম শ্রেণি-এ" instead of "সপ্তম শ্রেণিতে". | Reading the new screens in the browser. | Singular forms in English and a proper Bangla suffix. |
| Leaving the payment page during the short "verifying payment" step still triggered the jump to the application a moment later. | Code review while restructuring the page. | The delayed jump is cancelled when the page closes. |
| The help chat wrote "মোট 9টি আবেদন", an English digit inside a Bangla sentence. | Trying the chat in the browser. | Counts are formatted in the reader's digits. |
| The chat built its opening message from live data during rendering, which reads the clock. | The linter's purity check. | The greeting needs no live data, so it is now a plain function of the language. |
| The frontend image used `node:22-slim`, but some dependencies need Node 22.22 or newer. | Checking each package's required Node version. | Pinned to `node:24-slim`. |

## What has been checked

On my machine (.NET 10, PostgreSQL 16, Node 24) all 34 backend tests pass against the real
database, including the concurrency tests, and all 80 frontend tests pass. Every rule in the
brief was also checked by hand in the browser and against the API.

## What has not

`docker compose up` has not been run yet, because Docker is not installed on my machine.
Every command in the Dockerfiles was run by hand, but no image was built. To check:

```bash
docker compose up --build
docker compose --profile test run --rm --build backend-tests
docker compose --profile test run --rm --build frontend-tests
```
