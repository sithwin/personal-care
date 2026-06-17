ALTER TABLE projects_view ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE projects_view ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects_view ALTER COLUMN status SET DEFAULT 'draft';
