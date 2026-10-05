-- Field logs that reach the homeowner.
--
-- The admin saved field logs into a `daily_logs` column on `invoices`, which
-- doesn't exist — so every save failed ("Could not find the 'daily_logs'
-- column of 'invoices' in the schema cache"). The homeowner portal, meanwhile,
-- has always read logs from a `project_logs` table that nothing wrote to. The
-- admin now writes `project_logs` too; this makes sure the table is there, in
-- the shape the portal reads.
--
-- Safe to run whether or not the table already exists: nothing here drops or
-- rewrites existing data.

CREATE TABLE IF NOT EXISTS project_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  log_text TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In case the table exists from an earlier hand-made version without these.
ALTER TABLE project_logs ADD COLUMN IF NOT EXISTS log_text TEXT;
ALTER TABLE project_logs ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE project_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_project_logs_project
  ON project_logs (project_id, created_at DESC);

-- Access matches the rest of the app's tables (see the estimates migration):
-- the admin and the portal both use the public client, so with RLS on and no
-- policies, every read and write would be refused. Policies are only added if
-- the table has none, so an existing setup is left as it is.
ALTER TABLE project_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_logs') THEN
    CREATE POLICY "Public can read project logs" ON project_logs FOR SELECT USING (true);
    CREATE POLICY "Public can insert project logs" ON project_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;
