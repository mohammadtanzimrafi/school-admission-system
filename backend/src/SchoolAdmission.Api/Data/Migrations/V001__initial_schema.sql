-- ---------------------------------------------------------------------------
-- V001: classes, holds and the two read views.
--
-- Vocabulary
--   class  : one admission unit with its own seat count. Every shift is its own
--            class ("Class 6 - Morning Shift" and "Class 6 - Day Shift" are two rows).
--   hold   : one application by one student for one class. It starts HELD, and
--            ends CONFIRMED (fee paid), CANCELLED (withdrawn) or EXPIRED (timed out).
--
-- A hold occupies a seat while it is CONFIRMED, or HELD and not yet past
-- expires_at. Seat numbers are always derived from the holds table; there is no
-- stored counter that could drift away from the truth.
--
-- statement_timestamp() is used instead of now() because now() is frozen at
-- transaction start, which would be stale after waiting on a row lock.
-- ---------------------------------------------------------------------------

CREATE TABLE classes (
    id          uuid         PRIMARY KEY,
    name        varchar(100) NOT NULL,
    total_seats integer      NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT statement_timestamp(),

    CONSTRAINT ck_classes_name_not_blank       CHECK (btrim(name) <> ''),
    CONSTRAINT ck_classes_total_seats_positive CHECK (total_seats > 0)
);

CREATE TABLE holds (
    id           uuid           PRIMARY KEY,
    class_id     uuid           NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    student_id   varchar(17)    NOT NULL,
    status       varchar(10)    NOT NULL DEFAULT 'HELD',
    created_at   timestamptz(3) NOT NULL DEFAULT statement_timestamp(),
    expires_at   timestamptz(3) NOT NULL,
    confirmed_at timestamptz(3),
    cancelled_at timestamptz(3),

    CONSTRAINT ck_holds_student_id_format CHECK (student_id ~ '^[0-9]{17}$'),
    CONSTRAINT ck_holds_status            CHECK (status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')),
    CONSTRAINT ck_holds_expiry_after_start CHECK (expires_at > created_at),
    CONSTRAINT ck_holds_confirmed_at      CHECK ((status = 'CONFIRMED') = (confirmed_at IS NOT NULL)),
    CONSTRAINT ck_holds_cancelled_at      CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL))
);

-- A student may have at most one seat-occupying hold per class. The database
-- enforces this even if application code is wrong. The same index also answers
-- "how many seats of this class are taken?" as an index-only scan.
CREATE UNIQUE INDEX ux_holds_one_active_per_student_and_class
    ON holds (class_id, student_id)
    INCLUDE (status, expires_at)
    WHERE status IN ('HELD', 'CONFIRMED');

-- "My applications", newest first.
CREATE INDEX ix_holds_student_created
    ON holds (student_id, created_at DESC);

-- Lets the background sweeper find lapsed holds without scanning the table.
CREATE INDEX ix_holds_pending_expiry
    ON holds (expires_at)
    WHERE status = 'HELD';

-- Seat accounting for every class, defined once so every reader agrees.
CREATE VIEW class_seats AS
SELECT c.id,
       c.name,
       c.total_seats,
       c.created_at,
       s.held_seats,
       s.confirmed_seats,
       c.total_seats - s.held_seats - s.confirmed_seats AS available_seats
FROM classes c
CROSS JOIN LATERAL (
    SELECT (count(*) FILTER (WHERE h.status = 'HELD'))::integer      AS held_seats,
           (count(*) FILTER (WHERE h.status = 'CONFIRMED'))::integer AS confirmed_seats
    FROM holds h
    WHERE h.class_id = c.id
      AND h.status IN ('HELD', 'CONFIRMED')
      AND (h.status = 'CONFIRMED' OR h.expires_at > statement_timestamp())
) s;

-- A hold as the outside world sees it: a HELD row whose time has run out is
-- reported as EXPIRED immediately, whether or not the sweeper has caught up.
CREATE VIEW hold_details AS
SELECT h.id,
       h.class_id,
       c.name AS class_name,
       h.student_id,
       (CASE
            WHEN h.status = 'HELD' AND h.expires_at <= statement_timestamp() THEN 'EXPIRED'
            ELSE h.status
        END)::varchar(10) AS status,
       h.created_at,
       h.expires_at,
       (CASE
            WHEN h.status = 'HELD'
                THEN GREATEST(0, EXTRACT(EPOCH FROM (h.expires_at - statement_timestamp())))
            ELSE 0
        END)::double precision AS remaining_seconds
FROM holds h
JOIN classes c ON c.id = h.class_id;
