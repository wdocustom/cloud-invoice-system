-- Conditional intake: Tier B qualification answers and the branch refinement.
--
-- Builds on 20260917_lead_scoring_and_referrals.sql.
--
-- Tier B is the three questions asked at the unlock gate — timeline, budget fit
-- against the range the homeowner has just seen, and ownership. They get their
-- own columns rather than living inside `qualification` so the admin can filter
-- and sort on them without unpacking JSON on every row.
--
-- `intake_answers` holds the project-type branch answers (see
-- src/lib/intake-questions.ts), which are free-form by project type and so stay
-- JSON.
--
-- `initial_estimate_data` preserves the first-pass estimate the moment a
-- refinement overwrites `estimate_data`. Keeping the refined figure in the
-- existing column means every read path — admin, the public token page, the
-- emails — keeps working untouched and always shows the best number available.
--
-- `lead_score_override` lets Skyler correct a score by hand. A triage tool that
-- can't be corrected is one people work around instead of with.

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS intake_timeline TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS intake_budget_fit TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS intake_ownership TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS intake_answers JSONB;

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS initial_estimate_data JSONB;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS refined_at TIMESTAMPTZ;

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS lead_score_override INT;

-- Filtering the ledger by how soon someone wants to start.
CREATE INDEX IF NOT EXISTS idx_estimates_intake_timeline
  ON estimates (intake_timeline)
  WHERE intake_timeline IS NOT NULL;
