-- The deposit dollar column the payment-schedule UI has been writing since it
-- shipped, which never had a migration.
--
-- Without this column, PostgREST rejects the whole UPDATE the deposit editor
-- sends — so `deposit_percentage`, set in the same statement, never persisted
-- either. The admin showed the new percentage from local state while the
-- database and the homeowner portal kept the old one. That is the "allows you
-- to change but it doesn't update everywhere" symptom.
--
-- The app no longer depends on this column being present: percentages are the
-- source of truth and every dollar figure is derived from the current project
-- total. The column is a mirror, kept so anything reading the row directly
-- still sees a sensible number.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC;

-- Backfill the mirror from the percentage each proposal already carries.
UPDATE invoices
   SET deposit_amount = ROUND(COALESCE(amount, 0) * (COALESCE(deposit_percentage, 20) / 100.0), 2)
 WHERE deposit_amount IS NULL;

-- Re-derive every draw phase's stored dollar amount from its percentage against
-- the current contract total. Schedules edited before this fix hold amounts
-- frozen at an older total — percentages summing to 100% while the dollars add
-- up to less than the contract, which under-collects across the draws.
UPDATE invoices
   SET payment_phases = (
     SELECT jsonb_agg(
              phase || jsonb_build_object(
                'amount',
                ROUND(
                  COALESCE(amount, 0) * (COALESCE((phase ->> 'percentage')::NUMERIC, 0) / 100.0),
                  2
                )
              )
              ORDER BY ord
            )
       FROM jsonb_array_elements(payment_phases) WITH ORDINALITY AS t(phase, ord)
      WHERE phase ? 'percentage'
   )
 WHERE jsonb_typeof(payment_phases) = 'array'
   AND jsonb_array_length(payment_phases) > 0
   -- Only rows where every phase carries a percentage; anything else is left
   -- alone rather than guessed at.
   AND NOT EXISTS (
     SELECT 1
       FROM jsonb_array_elements(payment_phases) AS p
      WHERE NOT (p ? 'percentage')
   );
