-- ---------------------------------------------------------------------------
-- V002: class_seats also says how soon its numbers change on their own.
--
-- Seat numbers are shared between requests for a moment (ClassSeatsCache). A
-- held seat frees itself when its hold expires, with no write the cache could
-- notice, so each row now carries the seconds until its earliest such expiry,
-- measured by the database clock like every other time in this system. The
-- cache never keeps an answer past that point.
--
-- CREATE OR REPLACE VIEW may only add columns at the end; the others are as in V001.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW class_seats AS
SELECT c.id,
       c.name,
       c.total_seats,
       c.created_at,
       s.held_seats,
       s.confirmed_seats,
       c.total_seats - s.held_seats - s.confirmed_seats AS available_seats,
       EXTRACT(EPOCH FROM (s.next_expiry - statement_timestamp()))::double precision AS seconds_to_next_expiry
FROM classes c
CROSS JOIN LATERAL (
    SELECT (count(*) FILTER (WHERE h.status = 'HELD'))::integer      AS held_seats,
           (count(*) FILTER (WHERE h.status = 'CONFIRMED'))::integer AS confirmed_seats,
           min(h.expires_at) FILTER (WHERE h.status = 'HELD')         AS next_expiry
    FROM holds h
    WHERE h.class_id = c.id
      AND h.status IN ('HELD', 'CONFIRMED')
      AND (h.status = 'CONFIRMED' OR h.expires_at > statement_timestamp())
) s;
