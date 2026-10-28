-- Consultation bookings as leads.
--
-- The consultation form used to only send emails, so bookings never reached the
-- lead ledger. They now create or update a row in `estimates` (see
-- src/lib/consultation-lead.ts). `consultation_scheduled` and
-- `consultation_date` have existed since the table was created; this adds what
-- was missing to record the appointment and where the lead came from.
--
-- Re-runnable, and the route tolerates these columns not existing yet (see
-- insertTolerant/updateTolerant in src/lib/db.ts): deploying ahead of this
-- migration still records the booking, the date and the status.

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS consultation_time TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS consultation_booked_at TIMESTAMPTZ;

-- 'estimate' for the instant-estimate tool, 'consultation' for a booking with no
-- estimate behind it. Existing rows all came from the estimator.
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'estimate';
UPDATE estimates SET lead_source = 'estimate' WHERE lead_source IS NULL;

-- Matching a booking to an open lead by email.
CREATE INDEX IF NOT EXISTS idx_estimates_email_lower
  ON estimates (LOWER(email))
  WHERE email IS NOT NULL;

-- Upcoming visits, for the ledger.
CREATE INDEX IF NOT EXISTS idx_estimates_consultation_date
  ON estimates (consultation_date)
  WHERE consultation_scheduled = TRUE;
