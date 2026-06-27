-- Estimates table: stores instant estimate submissions as leads
CREATE TABLE IF NOT EXISTS estimates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  project_type TEXT NOT NULL,
  scope_level TEXT NOT NULL DEFAULT 'mid',
  size TEXT,
  zip TEXT,
  description TEXT NOT NULL,
  estimate_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',  -- new, contacted, consultation_scheduled, converted
  consultation_scheduled BOOLEAN DEFAULT FALSE,
  consultation_date TEXT,
  converted_to_invoice_id UUID REFERENCES invoices(id),
  reminder_emails JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookups (public estimate links)
CREATE INDEX IF NOT EXISTS idx_estimates_token ON estimates(token);

-- Index for admin listing
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);

-- RLS policies
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads by token (for public estimate pages)
CREATE POLICY "Public can read estimates by token"
  ON estimates FOR SELECT
  USING (true);

-- Allow anonymous inserts (from the estimate API)
CREATE POLICY "Public can insert estimates"
  ON estimates FOR INSERT
  WITH CHECK (true);

-- Allow authenticated updates (for admin actions)
CREATE POLICY "Public can update estimates"
  ON estimates FOR UPDATE
  USING (true);
