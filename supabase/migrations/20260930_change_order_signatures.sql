-- Change orders that hold up.
--
-- The terms (§3) require a change order to be "signed or electronically
-- approved by both parties before the additional work begins", and to state
-- the scope, the price adjustment, and any impact to the timeline.
--
-- Until now a change order was approved with a browser confirm() that flipped
-- its status client-side — no name, no time, nothing to show afterwards who
-- agreed. Change orders already share `signature_name` and `signed_at` with the
-- contract they amend; these columns add what an electronic signature needs to
-- be defensible later, and the timeline impact the terms say must be stated.
--
-- Re-runnable, and the routes tolerate these columns not existing yet (see
-- insertTolerant/updateTolerant in src/lib/db.ts): deploying ahead of this
-- migration still records the name and timestamp, just not the IP and agent.

-- Where the signature came from.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signed_ip TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signed_user_agent TEXT;

-- "Adds 3 working days". Blank means no change to the completion date, and the
-- document says so explicitly rather than leaving it unstated.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS schedule_impact TEXT;

-- The ledger now reads change orders alongside their contracts to show one
-- revised total per job.
CREATE INDEX IF NOT EXISTS idx_invoices_parent_id
  ON invoices (parent_id)
  WHERE parent_id IS NOT NULL;
