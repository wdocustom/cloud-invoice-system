-- Sequential document numbering for leads (estimates) and proposals.
--
-- The number is issued once, at the lead — the moment the estimate link is
-- generated — and the proposal inherits that same root when the lead converts.
-- One opportunity therefore reads end to end as:
--
--   EST-2026-0007  (public estimate link)
--     └─ PRO-2026-0007  (proposal / contract)
--          └─ PRO-2026-0007-CO1  (change order)
--
-- A proposal written straight from the admin with no lead behind it simply
-- draws the next number off the same counter, so the two entry points never
-- collide and the book has no gaps.

-- ── The counter ───────────────────────────────────────────────────────────
-- One row per calendar year; numbering restarts at 1 each January.
CREATE TABLE IF NOT EXISTS document_sequences (
  year INT PRIMARY KEY,
  last_value INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No policies are defined on purpose. The counter is only ever touched through
-- next_document_number() below, which is SECURITY DEFINER, so RLS keeps the
-- table opaque to direct PostgREST reads and writes.
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

-- Hands out the next number for a year. The upsert is a single statement, so
-- concurrent callers serialise on the year's row lock and can never be handed
-- the same value.
CREATE OR REPLACE FUNCTION next_document_number(p_year INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INT;
BEGIN
  INSERT INTO document_sequences (year, last_value)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_value = document_sequences.last_value + 1,
        updated_at = NOW()
  RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION next_document_number(INT) TO anon, authenticated, service_role;

-- ── Columns ───────────────────────────────────────────────────────────────
-- sequence_year + sequence_no are the machine-readable root; the *_number
-- columns are the human-facing rendering of it, stored so the label a customer
-- was shown can never drift if the format changes later.
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS estimate_number TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sequence_year INT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sequence_no INT;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS proposal_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sequence_year INT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sequence_no INT;
-- The estimate this proposal grew out of, kept for the paper trail.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS estimate_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_estimates_estimate_number
  ON estimates(estimate_number) WHERE estimate_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_proposal_number
  ON invoices(proposal_number) WHERE proposal_number IS NOT NULL;

-- ── Backfill ──────────────────────────────────────────────────────────────
-- Existing records are numbered oldest-first so the book reads chronologically.

-- 1. Every lead, by year of creation.
UPDATE estimates e
   SET sequence_year   = n.yr,
       sequence_no     = n.seq,
       estimate_number = 'EST-' || n.yr || '-' || LPAD(n.seq::TEXT, 4, '0')
  FROM (
    SELECT id,
           EXTRACT(YEAR FROM created_at)::INT AS yr,
           ROW_NUMBER() OVER (
             PARTITION BY EXTRACT(YEAR FROM created_at)
             ORDER BY created_at, id
           ) AS seq
      FROM estimates
     WHERE estimate_number IS NULL
  ) n
 WHERE e.id = n.id;

-- 2. Proposals that came from a lead inherit that lead's root.
UPDATE invoices i
   SET sequence_year   = e.sequence_year,
       sequence_no     = e.sequence_no,
       estimate_number = e.estimate_number,
       proposal_number = 'PRO-' || e.sequence_year || '-' || LPAD(e.sequence_no::TEXT, 4, '0')
  FROM estimates e
 WHERE e.converted_to_invoice_id = i.id
   AND e.sequence_no IS NOT NULL
   AND i.proposal_number IS NULL;

-- 3. Proposals with no lead behind them continue past the year's high-water
--    mark, so they interleave with the lead numbers without ever reusing one.
UPDATE invoices i
   SET sequence_year   = n.yr,
       sequence_no     = n.seq,
       proposal_number = 'PRO-' || n.yr || '-' || LPAD(n.seq::TEXT, 4, '0')
  FROM (
    SELECT v.id,
           v.yr,
           COALESCE(hw.high_water, 0)
             + ROW_NUMBER() OVER (PARTITION BY v.yr ORDER BY v.created_at, v.id) AS seq
      FROM (
        SELECT id, created_at, EXTRACT(YEAR FROM created_at)::INT AS yr
          FROM invoices
         WHERE parent_id IS NULL
           AND proposal_number IS NULL
      ) v
      LEFT JOIN (
        SELECT yr, MAX(seq) AS high_water
          FROM (
            SELECT sequence_year AS yr, sequence_no AS seq FROM estimates WHERE sequence_no IS NOT NULL
            UNION ALL
            SELECT sequence_year, sequence_no FROM invoices WHERE sequence_no IS NOT NULL
          ) all_seqs
         GROUP BY yr
      ) hw ON hw.yr = v.yr
  ) n
 WHERE i.id = n.id;

-- 4. Change orders hang off their parent's number rather than burning one of
--    their own — PRO-2026-0007-CO1, -CO2, and so on.
UPDATE invoices c
   SET proposal_number = p.proposal_number || '-CO' || n.co_index,
       sequence_year   = p.sequence_year,
       sequence_no     = p.sequence_no,
       estimate_number = p.estimate_number
  FROM (
    SELECT id,
           parent_id,
           ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at, id) AS co_index
      FROM invoices
     WHERE parent_id IS NOT NULL
       AND proposal_number IS NULL
  ) n
  JOIN invoices p ON p.id = n.parent_id
 WHERE c.id = n.id
   AND p.proposal_number IS NOT NULL;

-- 5. Point the counter past everything the backfill just used.
INSERT INTO document_sequences (year, last_value)
SELECT yr, MAX(seq)
  FROM (
    SELECT sequence_year AS yr, sequence_no AS seq FROM estimates WHERE sequence_no IS NOT NULL
    UNION ALL
    SELECT sequence_year, sequence_no FROM invoices WHERE sequence_no IS NOT NULL AND parent_id IS NULL
  ) all_seqs
 WHERE yr IS NOT NULL
 GROUP BY yr
    ON CONFLICT (year) DO UPDATE
   SET last_value = GREATEST(document_sequences.last_value, EXCLUDED.last_value),
       updated_at = NOW();
