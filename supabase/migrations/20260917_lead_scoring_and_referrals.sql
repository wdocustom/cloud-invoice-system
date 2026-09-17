-- Lead scoring and trade referrals.
--
-- Two additions to `estimates`:
--
-- 1. Scoring. Every lead is scored 0-100 from the signals the estimator already
--    collects, so the admin ledger can be ordered by something other than
--    arrival time. `qualification` keeps the full component breakdown — a score
--    you cannot interrogate is a score nobody trusts by week three — and
--    `lead_score_version` records which set of weights produced the number, so
--    a 72 scored under v1 is never silently compared against a v2 72.
--
-- 2. Referrals. Project types WDO doesn't self-perform (painting) are routed to
--    a partner. These columns record who the lead went to and when, so the
--    handoff is visible in the ledger rather than living only in an outbox.
--
-- Written to be re-runnable: the app applies schema by hand in the Supabase
-- dashboard, and the routes tolerate these columns not existing yet (see
-- insertTolerant/updateTolerant in src/lib/db.ts), so deploying ahead of this
-- migration degrades to the previous behaviour instead of failing a write.

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS lead_score INT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS lead_band TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS lead_score_version INT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS lead_flags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS qualification JSONB;

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS referred_partner_id TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;

-- Triage ordering: band first, then score. Partial index because converted
-- leads are history, not a worklist.
CREATE INDEX IF NOT EXISTS idx_estimates_triage
  ON estimates (lead_band, lead_score DESC)
  WHERE converted_to_invoice_id IS NULL;

-- Referral lookups ("what has Ben been sent?") stay cheap.
CREATE INDEX IF NOT EXISTS idx_estimates_referred_partner
  ON estimates (referred_partner_id)
  WHERE referred_partner_id IS NOT NULL;
