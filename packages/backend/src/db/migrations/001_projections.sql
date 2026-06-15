-- categories_view
CREATE TABLE IF NOT EXISTS categories_view (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📂',
  color TEXT NOT NULL DEFAULT '#6b7280',
  is_default BOOLEAN NOT NULL DEFAULT false,
  task_count INT NOT NULL DEFAULT 0,
  item_count INT NOT NULL DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT false
);

-- tasks_view
CREATE TABLE IF NOT EXISTS tasks_view (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL,
  project_id UUID,
  status TEXT NOT NULL DEFAULT 'ready',
  estimated_duration_value INT,
  estimated_duration_unit TEXT,
  due_date TIMESTAMPTZ,
  scheduled_date DATE,
  scheduled_start_time TIME,
  recurrence_rule JSONB,
  next_due_date TIMESTAMPTZ,
  completion_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- items_view
CREATE TABLE IF NOT EXISTS items_view (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'to_buy',
  quantity INT,
  price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- task_items_view
CREATE TABLE IF NOT EXISTS task_items_view (
  task_id UUID NOT NULL,
  item_id UUID NOT NULL,
  consumable BOOLEAN NOT NULL DEFAULT true,
  item_status TEXT NOT NULL DEFAULT 'to_buy',
  PRIMARY KEY (task_id, item_id)
);

-- projects_view
CREATE TABLE IF NOT EXISTS projects_view (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  due_date TIMESTAMPTZ,
  task_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- resources_view
CREATE TABLE IF NOT EXISTS resources_view (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  category_id UUID,
  task_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- task_resources_view
CREATE TABLE IF NOT EXISTS task_resources_view (
  task_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  PRIMARY KEY (task_id, resource_id)
);

-- balance_rules_view
CREATE TABLE IF NOT EXISTS balance_rules_view (
  id UUID PRIMARY KEY,
  category_id UUID NOT NULL,
  minimum_count INT NOT NULL DEFAULT 1,
  frequency TEXT NOT NULL,
  day_restriction TEXT
);

-- balance_status_view
CREATE TABLE IF NOT EXISTS balance_status_view (
  rule_id UUID NOT NULL,
  category_id UUID NOT NULL,
  frequency TEXT NOT NULL,
  target_count INT NOT NULL,
  actual_count INT NOT NULL DEFAULT 0,
  is_met BOOLEAN NOT NULL DEFAULT false,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (rule_id)
);

-- dashboard_view (single row, id=1)
CREATE TABLE IF NOT EXISTS dashboard_view (
  id INT PRIMARY KEY DEFAULT 1,
  ready_count INT NOT NULL DEFAULT 0,
  ongoing_count INT NOT NULL DEFAULT 0,
  pending_count INT NOT NULL DEFAULT 0,
  planned_count INT NOT NULL DEFAULT 0,
  to_buy_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO dashboard_view (id) VALUES (1) ON CONFLICT DO NOTHING;
