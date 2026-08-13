-- Full customer contact details on leads, carried through to proposals.
--
-- Leads created from the instant-estimate tool only capture name/email/phone/zip.
-- The admin needs to fill in the rest (street address, city, state, internal
-- notes) before converting the lead into a proposal, and that information has to
-- travel with the lead.

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Proposals keep a phone number so the contractor doesn't lose the lead's only
-- contact method when the lead had no email address.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS homeowner_phone TEXT;
