# GTD Core — Phase 2: Projections & Read Models

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All PostgreSQL read-model tables (projections), 8 projectors that rebuild them from events, and the projector runner that applies projectors synchronously after each command.

**Architecture:** Projectors are pure functions: `(event: StoredEvent, db: Pool) => Promise<void>`. The ProjectorRunner is called by the CommandBus after appending events — projections are always synchronous with commands in this personal app. Task status is a computed column in `tasks_view`, derived from `started_at`, `completed_at`, `due_date`, and `task_items_view.item_status`.

**Prerequisite:** Phase 1 complete. PostgreSQL running. Event store table exists.

---

### Task 9: Database migrations — projection tables

**Files:**
- Create: `packages/backend/src/db/migrations/001_projections.sql`
- Modify: `packages/backend/src/db/migrate.ts`

- [ ] **Step 1: Write `packages/backend/src/db/migrations/001_projections.sql`**

```sql
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
```

- [ ] **Step 2: Update `packages/backend/src/db/migrate.ts` to run projection migration**

```typescript
import { getPool } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  const pool = getPool();

  // Event store
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      aggregate_id UUID NOT NULL,
      aggregate_type TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      version INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(aggregate_id, version)
    )
  `);

  // Projections
  const sql = readFileSync(join(__dirname, 'migrations/001_projections.sql'), 'utf8');
  await pool.query(sql);

  console.log('All migrations complete');
  await pool.end();
}

migrate().catch(console.error);
```

- [ ] **Step 3: Run migrations**

```bash
cd packages/backend && npx ts-node --esm src/db/migrate.ts
```

Expected: `All migrations complete` — no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/db/
git commit -m "feat: projection table migrations"
```

---

### Task 10: Tasks projector

**Files:**
- Create: `packages/backend/src/projections/tasks.projector.ts`
- Create: `packages/backend/tests/projections/tasks.projector.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/backend/tests/projections/tasks.projector.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { tasksProjector } from '../../src/projections/tasks.projector';

let pool: Pool;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
});
afterAll(async () => { await pool.end(); });
beforeEach(async () => {
  await pool.query('TRUNCATE tasks_view, task_items_view, categories_view RESTART IDENTITY');
  await pool.query(`INSERT INTO categories_view (id, name, icon, color) VALUES ('cat-1', 'Cars', '🚗', '#3b82f6') ON CONFLICT DO NOTHING`);
});

describe('Tasks projector', () => {
  it('TaskCreated inserts task with status ready', async () => {
    await tasksProjector({ id: 1, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    const row = await pool.query('SELECT * FROM tasks_view WHERE id = $1', ['task-1']);
    expect(row.rows[0].name).toBe('Oil change');
    expect(row.rows[0].status).toBe('ready');
  });

  it('TaskStarted sets status to ongoing', async () => {
    await tasksProjector({ id: 1, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    await tasksProjector({ id: 2, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskStarted', payload: { id: 'task-1' }, version: 2, createdAt: new Date() }, pool);
    const row = await pool.query('SELECT status FROM tasks_view WHERE id = $1', ['task-1']);
    expect(row.rows[0].status).toBe('ongoing');
  });

  it('TaskCompleted sets status to done for non-recurring', async () => {
    await tasksProjector({ id: 1, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    await tasksProjector({ id: 2, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: 'task-1', itemDisposals: [] }, version: 2, createdAt: new Date() }, pool);
    const row = await pool.query('SELECT status FROM tasks_view WHERE id = $1', ['task-1']);
    expect(row.rows[0].status).toBe('done');
  });

  it('TaskRescheduled resets task to planned with new due date', async () => {
    await tasksProjector({ id: 1, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    await tasksProjector({ id: 2, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: 'task-1', itemDisposals: [] }, version: 2, createdAt: new Date() }, pool);
    const nextDueDate = new Date('2027-06-14').toISOString();
    await tasksProjector({ id: 3, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskRescheduled', payload: { id: 'task-1', nextDueDate }, version: 3, createdAt: new Date() }, pool);
    const row = await pool.query('SELECT status, completion_count, due_date FROM tasks_view WHERE id = $1', ['task-1']);
    expect(row.rows[0].status).toBe('planned');
    expect(row.rows[0].completion_count).toBe(1);
  });

  it('ItemRequirementAdded inserts into task_items_view and sets task to pending', async () => {
    await pool.query(`INSERT INTO items_view (id, name, category_id, status) VALUES ('item-1', 'Solar light', 'cat-1', 'to_buy') ON CONFLICT DO NOTHING`);
    await tasksProjector({ id: 1, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Set up solar light', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    await tasksProjector({ id: 2, aggregateId: 'task-1', aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: 'task-1', itemId: 'item-1', consumable: true }, version: 2, createdAt: new Date() }, pool);
    const row = await pool.query('SELECT status FROM tasks_view WHERE id = $1', ['task-1']);
    expect(row.rows[0].status).toBe('pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx vitest run tests/projections/tasks.projector.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write `packages/backend/src/projections/tasks.projector.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';

async function deriveAndUpdateStatus(taskId: string, pool: Pool): Promise<void> {
  const taskRes = await pool.query('SELECT started_at, completed_at, due_date, recurrence_rule FROM tasks_view WHERE id = $1', [taskId]);
  if (taskRes.rows.length === 0) return;
  const task = taskRes.rows[0];

  const itemsRes = await pool.query('SELECT item_status FROM task_items_view WHERE task_id = $1', [taskId]);
  const hasPendingItems = itemsRes.rows.some((r: { item_status: string }) => r.item_status === 'to_buy');

  let status: string;
  if (task.completed_at && !task.recurrence_rule) {
    status = 'done';
  } else if (task.started_at && !task.completed_at) {
    status = 'ongoing';
  } else if (hasPendingItems) {
    status = 'pending';
  } else if (task.due_date && new Date(task.due_date) > new Date()) {
    status = 'planned';
  } else {
    status = 'ready';
  }

  await pool.query('UPDATE tasks_view SET status = $1 WHERE id = $2', [status, taskId]);
}

export async function tasksProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;

  switch (event.eventType) {
    case 'TaskCreated': {
      const dur = p.estimatedDuration as { value: number; unit: string } | undefined;
      await pool.query(
        `INSERT INTO tasks_view (id, name, description, category_id, project_id, due_date,
          estimated_duration_value, estimated_duration_unit, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ready')
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description ?? null, p.categoryId, p.projectId ?? null,
         p.dueDate ?? null, dur?.value ?? null, dur?.unit ?? null]
      );
      await deriveAndUpdateStatus(p.id as string, pool);
      break;
    }
    case 'TaskStarted':
      await pool.query('UPDATE tasks_view SET started_at = NOW() WHERE id = $1', [p.id]);
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'TaskCompleted':
      await pool.query('UPDATE tasks_view SET completed_at = NOW() WHERE id = $1', [p.id]);
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'TaskRescheduled':
      await pool.query(
        `UPDATE tasks_view SET started_at = NULL, completed_at = NULL,
         due_date = $1, completion_count = completion_count + 1 WHERE id = $2`,
        [p.nextDueDate, p.id]
      );
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'ItemRequirementAdded': {
      const itemRes = await pool.query('SELECT status FROM items_view WHERE id = $1', [p.itemId]);
      const itemStatus = itemRes.rows[0]?.status ?? 'to_buy';
      await pool.query(
        `INSERT INTO task_items_view (task_id, item_id, consumable, item_status)
         VALUES ($1,$2,$3,$4) ON CONFLICT (task_id, item_id) DO NOTHING`,
        [p.taskId, p.itemId, p.consumable, itemStatus]
      );
      await deriveAndUpdateStatus(p.taskId as string, pool);
      break;
    }

    case 'TaskScheduled':
      await pool.query(
        'UPDATE tasks_view SET scheduled_date = $1, scheduled_start_time = $2 WHERE id = $3',
        [p.scheduledDate, p.scheduledStartTime, p.id]
      );
      break;

    case 'TaskRecurrenceSet':
      await pool.query(
        'UPDATE tasks_view SET recurrence_rule = $1, due_date = COALESCE($2, due_date) WHERE id = $3',
        [JSON.stringify(p.recurrenceRule), p.dueDate ?? null, p.id]
      );
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'RecurrenceSkipped':
      await pool.query('UPDATE tasks_view SET due_date = $1 WHERE id = $2', [p.nextDueDate, p.id]);
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'TaskPromotedToProject':
      await pool.query('UPDATE tasks_view SET project_id = $1 WHERE id = $2', [p.projectId, p.taskId]);
      break;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/backend && npx vitest run tests/projections/tasks.projector.test.ts
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/projections/tasks.projector.ts packages/backend/tests/projections/tasks.projector.test.ts
git commit -m "feat: Tasks projector with status derivation"
```

---

### Task 11: Items projector + task unblocking

**Files:**
- Create: `packages/backend/src/projections/items.projector.ts`

- [ ] **Step 1: Write `packages/backend/src/projections/items.projector.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';

async function updateTasksForItem(itemId: string, newStatus: string, pool: Pool): Promise<void> {
  // Update item_status in task_items_view for all tasks that require this item
  await pool.query('UPDATE task_items_view SET item_status = $1 WHERE item_id = $2', [newStatus, itemId]);
  // Re-derive status for all affected tasks
  const affected = await pool.query('SELECT task_id FROM task_items_view WHERE item_id = $1', [itemId]);
  for (const row of affected.rows) {
    const taskRes = await pool.query('SELECT started_at, completed_at, due_date, recurrence_rule FROM tasks_view WHERE id = $1', [row.task_id]);
    if (taskRes.rows.length === 0) continue;
    const task = taskRes.rows[0];
    const itemsRes = await pool.query('SELECT item_status FROM task_items_view WHERE task_id = $1', [row.task_id]);
    const hasPendingItems = itemsRes.rows.some((r: { item_status: string }) => r.item_status === 'to_buy');
    let status: string;
    if (task.completed_at && !task.recurrence_rule) status = 'done';
    else if (task.started_at && !task.completed_at) status = 'ongoing';
    else if (hasPendingItems) status = 'pending';
    else if (task.due_date && new Date(task.due_date) > new Date()) status = 'planned';
    else status = 'ready';
    await pool.query('UPDATE tasks_view SET status = $1 WHERE id = $2', [status, row.task_id]);
  }
}

export async function itemsProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;

  switch (event.eventType) {
    case 'ItemCreated':
      await pool.query(
        `INSERT INTO items_view (id, name, description, category_id, status, quantity, price, notes)
         VALUES ($1,$2,$3,$4,'to_buy',$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description ?? null, p.categoryId, p.quantity ?? null, p.price ?? null, p.notes ?? null]
      );
      break;

    case 'ItemMarkedAvailable':
      await pool.query('UPDATE items_view SET status = $1 WHERE id = $2', ['available', p.id]);
      await updateTasksForItem(p.id as string, 'available', pool);
      break;

    case 'ItemMarkedAvailableAgain':
      await pool.query('UPDATE items_view SET status = $1 WHERE id = $2', ['available', p.id]);
      await updateTasksForItem(p.id as string, 'available', pool);
      break;

    case 'ItemMarkedConsumed':
      await pool.query('UPDATE items_view SET status = $1 WHERE id = $2', ['consumed', p.id]);
      await updateTasksForItem(p.id as string, 'consumed', pool);
      break;
  }
}
```

- [ ] **Step 2: Write integration test**

```typescript
// packages/backend/tests/projections/items.projector.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { itemsProjector } from '../../src/projections/items.projector';
import { tasksProjector } from '../../src/projections/tasks.projector';

let pool: Pool;
beforeAll(async () => { pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' }); });
afterAll(async () => { await pool.end(); });
beforeEach(async () => {
  await pool.query('TRUNCATE tasks_view, items_view, task_items_view, categories_view RESTART IDENTITY');
  await pool.query(`INSERT INTO categories_view (id, name, icon, color) VALUES ('cat-1', 'Home', '🏠', '#22c55e') ON CONFLICT DO NOTHING`);
});

describe('Items projector', () => {
  it('ItemCreated inserts item with status to_buy', async () => {
    await itemsProjector({ id: 1, aggregateId: 'item-1', aggregateType: 'item', eventType: 'ItemCreated', payload: { id: 'item-1', name: 'Solar light', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    const row = await pool.query('SELECT status FROM items_view WHERE id = $1', ['item-1']);
    expect(row.rows[0].status).toBe('to_buy');
  });

  it('MarkItemAvailable updates item and unblocks tasks', async () => {
    // Setup: task pending due to item
    await itemsProjector({ id: 1, aggregateId: 'item-1', aggregateType: 'item', eventType: 'ItemCreated', payload: { id: 'item-1', name: 'Solar light', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    await tasksProjector({ id: 2, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Set up solar light', categoryId: 'cat-1' }, version: 1, createdAt: new Date() }, pool);
    await tasksProjector({ id: 3, aggregateId: 'task-1', aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: 'task-1', itemId: 'item-1', consumable: true }, version: 2, createdAt: new Date() }, pool);
    const before = await pool.query('SELECT status FROM tasks_view WHERE id = $1', ['task-1']);
    expect(before.rows[0].status).toBe('pending');
    // Mark item available
    await itemsProjector({ id: 4, aggregateId: 'item-1', aggregateType: 'item', eventType: 'ItemMarkedAvailable', payload: { id: 'item-1' }, version: 2, createdAt: new Date() }, pool);
    const after = await pool.query('SELECT status FROM tasks_view WHERE id = $1', ['task-1']);
    expect(after.rows[0].status).toBe('ready');
  });
});
```

- [ ] **Step 3: Run test**

```bash
cd packages/backend && npx vitest run tests/projections/items.projector.test.ts
```

Expected: PASS — 2 tests passing.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/projections/items.projector.ts packages/backend/tests/projections/items.projector.test.ts
git commit -m "feat: Items projector with task unblocking"
```

---

### Task 12: Remaining projectors (categories, projects, resources, balance, dashboard)

**Files:**
- Create: `packages/backend/src/projections/categories.projector.ts`
- Create: `packages/backend/src/projections/projects.projector.ts`
- Create: `packages/backend/src/projections/resources.projector.ts`
- Create: `packages/backend/src/projections/balance.projector.ts`
- Create: `packages/backend/src/projections/dashboard.projector.ts`

- [ ] **Step 1: Write `packages/backend/src/projections/categories.projector.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';

export async function categoriesProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;
  switch (event.eventType) {
    case 'CategoryCreated':
      await pool.query(
        `INSERT INTO categories_view (id, name, icon, color, is_default)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.icon ?? '📂', p.color ?? '#6b7280', p.isDefault ?? false]
      );
      break;
    case 'CategoryUpdated':
      await pool.query(
        `UPDATE categories_view SET
         name = COALESCE($1, name), icon = COALESCE($2, icon), color = COALESCE($3, color)
         WHERE id = $4`,
        [p.name ?? null, p.icon ?? null, p.color ?? null, p.id]
      );
      break;
    case 'CategoryDeleted':
      await pool.query('UPDATE categories_view SET deleted = true WHERE id = $1', [p.id]);
      break;
    case 'TaskCreated':
      await pool.query('UPDATE categories_view SET task_count = task_count + 1 WHERE id = $1', [p.categoryId]);
      break;
    case 'ItemCreated':
      await pool.query('UPDATE categories_view SET item_count = item_count + 1 WHERE id = $1', [p.categoryId]);
      break;
  }
}
```

- [ ] **Step 2: Write `packages/backend/src/projections/projects.projector.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';

export async function projectsProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;
  switch (event.eventType) {
    case 'ProjectCreated':
      await pool.query(
        `INSERT INTO projects_view (id, name, description, category_id, due_date)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description ?? null, p.categoryId, p.dueDate ?? null]
      );
      break;
    case 'TaskAddedToProject':
      await pool.query(
        `UPDATE projects_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2`,
        [p.taskId, p.projectId]
      );
      break;
    case 'ProjectCompleted':
      await pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['done', p.id]);
      break;
    case 'TaskPromotedToProject':
      // Task is being promoted: create a project entry linked to this task
      await pool.query(
        `UPDATE projects_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2`,
        [p.taskId, p.projectId]
      );
      break;
  }
}
```

- [ ] **Step 3: Write `packages/backend/src/projections/resources.projector.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';

export async function resourcesProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;
  switch (event.eventType) {
    case 'ResourceCreated':
      await pool.query(
        `INSERT INTO resources_view (id, title, type, url, notes, category_id)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.title, p.type, p.url ?? null, p.notes ?? null, p.categoryId ?? null]
      );
      break;
    case 'ResourceUpdated':
      await pool.query(
        `UPDATE resources_view SET
         title = COALESCE($1, title), url = COALESCE($2, url), notes = COALESCE($3, notes)
         WHERE id = $4`,
        [p.title ?? null, p.url ?? null, p.notes ?? null, p.id]
      );
      break;
    case 'ResourceDeleted':
      await pool.query('DELETE FROM resources_view WHERE id = $1', [p.id]);
      break;
    case 'ResourceAttachedToTask': {
      const res = await pool.query('SELECT title, type FROM resources_view WHERE id = $1', [p.resourceId]);
      if (res.rows.length === 0) break;
      await pool.query(
        `INSERT INTO task_resources_view (task_id, resource_id, title, type)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [p.taskId, p.resourceId, res.rows[0].title, res.rows[0].type]
      );
      await pool.query(
        `UPDATE resources_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2 AND NOT ($1::uuid = ANY(task_ids))`,
        [p.taskId, p.resourceId]
      );
      break;
    }
    case 'ResourceDetachedFromTask':
      await pool.query('DELETE FROM task_resources_view WHERE task_id = $1 AND resource_id = $2', [p.taskId, p.resourceId]);
      await pool.query(
        `UPDATE resources_view SET task_ids = array_remove(task_ids, $1::uuid) WHERE id = $2`,
        [p.taskId, p.resourceId]
      );
      break;
  }
}
```

- [ ] **Step 4: Write `packages/backend/src/projections/balance.projector.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';

function getPeriodBounds(frequency: string, dayRestriction: string | null): { start: Date; end: Date } | null {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;

  if (frequency === 'daily') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (frequency === 'weekly') {
    if (dayRestriction === 'weekend' && !isWeekend) return null;
    const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (frequency === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  return null;
}

async function refreshBalanceStatus(pool: Pool): Promise<void> {
  const rules = await pool.query('SELECT * FROM balance_rules_view');
  for (const rule of rules.rows) {
    const bounds = getPeriodBounds(rule.frequency, rule.day_restriction);
    if (!bounds) {
      await pool.query(
        `INSERT INTO balance_status_view (rule_id, category_id, frequency, target_count, actual_count, is_met, period_start, period_end)
         VALUES ($1,$2,$3,$4,0,false,NOW(),NOW())
         ON CONFLICT (rule_id) DO UPDATE SET actual_count=0, is_met=false`,
        [rule.id, rule.category_id, rule.frequency, rule.minimum_count]
      );
      continue;
    }
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM events
       WHERE event_type = 'TaskCompleted'
         AND created_at BETWEEN $1 AND $2
         AND payload->>'id' IN (
           SELECT id::text FROM tasks_view WHERE category_id = $3
         )`,
      [bounds.start, bounds.end, rule.category_id]
    );
    const actual = parseInt(countRes.rows[0].count, 10);
    await pool.query(
      `INSERT INTO balance_status_view (rule_id, category_id, frequency, target_count, actual_count, is_met, period_start, period_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (rule_id) DO UPDATE SET
         actual_count=$5, is_met=$6, period_start=$7, period_end=$8`,
      [rule.id, rule.category_id, rule.frequency, rule.minimum_count, actual, actual >= rule.minimum_count, bounds.start, bounds.end]
    );
  }
}

export async function balanceProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;
  switch (event.eventType) {
    case 'BalanceRuleCreated':
      await pool.query(
        `INSERT INTO balance_rules_view (id, category_id, minimum_count, frequency, day_restriction)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.categoryId, p.minimumCount, p.frequency, p.dayRestriction ?? null]
      );
      await refreshBalanceStatus(pool);
      break;
    case 'BalanceRuleUpdated':
      await pool.query(
        `UPDATE balance_rules_view SET
         minimum_count = COALESCE($1, minimum_count),
         frequency = COALESCE($2, frequency),
         day_restriction = COALESCE($3, day_restriction)
         WHERE id = $4`,
        [p.minimumCount ?? null, p.frequency ?? null, p.dayRestriction ?? null, p.id]
      );
      await refreshBalanceStatus(pool);
      break;
    case 'BalanceRuleDeleted':
      await pool.query('DELETE FROM balance_rules_view WHERE id = $1', [p.id]);
      await pool.query('DELETE FROM balance_status_view WHERE rule_id = $1', [p.id]);
      break;
    case 'TaskCompleted':
      await refreshBalanceStatus(pool);
      break;
  }
}
```

- [ ] **Step 5: Write `packages/backend/src/projections/dashboard.projector.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';

const TASK_EVENTS = new Set(['TaskCreated', 'TaskStarted', 'TaskCompleted', 'TaskRescheduled', 'ItemRequirementAdded', 'TaskRecurrenceSet', 'RecurrenceSkipped']);
const ITEM_EVENTS = new Set(['ItemCreated', 'ItemMarkedAvailable', 'ItemMarkedConsumed', 'ItemMarkedAvailableAgain']);

async function refreshDashboard(pool: Pool): Promise<void> {
  await pool.query(`
    UPDATE dashboard_view SET
      ready_count   = (SELECT COUNT(*) FROM tasks_view WHERE status = 'ready'),
      ongoing_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'ongoing'),
      pending_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'pending'),
      planned_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'planned'),
      to_buy_count  = (SELECT COUNT(*) FROM items_view WHERE status = 'to_buy'),
      updated_at    = NOW()
    WHERE id = 1
  `);
}

export async function dashboardProjector(event: StoredEvent, pool: Pool): Promise<void> {
  if (TASK_EVENTS.has(event.eventType) || ITEM_EVENTS.has(event.eventType)) {
    await refreshDashboard(pool);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/projections/
git commit -m "feat: categories, projects, resources, balance, dashboard projectors"
```

---

### Task 13: Projector runner

**Files:**
- Create: `packages/backend/src/projections/runner.ts`
- Modify: `packages/backend/src/command-bus/command-bus.ts`

- [ ] **Step 1: Write `packages/backend/src/projections/runner.ts`**

```typescript
import { Pool } from 'pg';
import { StoredEvent } from '../types';
import { tasksProjector } from './tasks.projector';
import { itemsProjector } from './items.projector';
import { categoriesProjector } from './categories.projector';
import { projectsProjector } from './projects.projector';
import { resourcesProjector } from './resources.projector';
import { balanceProjector } from './balance.projector';
import { dashboardProjector } from './dashboard.projector';

const PROJECTORS = [
  categoriesProjector,
  itemsProjector,
  tasksProjector,
  projectsProjector,
  resourcesProjector,
  balanceProjector,
  dashboardProjector,
];

export async function runProjectors(events: StoredEvent[], pool: Pool): Promise<void> {
  for (const event of events) {
    for (const projector of PROJECTORS) {
      await projector(event, pool);
    }
  }
}
```

- [ ] **Step 2: Update `packages/backend/src/command-bus/command-bus.ts` to call projectors after dispatch**

Add `pool` parameter to constructor and call `runProjectors` after `append`:

```typescript
import { EventStore } from '../event-store/event-store';
import { StoredEvent } from '../types';
import { Pool } from 'pg';
import { runProjectors } from '../projections/runner';
import { handleCategoryCommand } from '../domain/category/aggregate';
import { handleItemCommand } from '../domain/item/aggregate';
import { handleTaskCommand } from '../domain/task/aggregate';
import { handleProjectCommand } from '../domain/project/aggregate';
import { handleResourceCommand } from '../domain/resource/aggregate';
import { handleBalanceRuleCommand } from '../domain/balance-rule/aggregate';

type AnyCommand = Parameters<typeof handleCategoryCommand>[0]
  | Parameters<typeof handleItemCommand>[0]
  | Parameters<typeof handleTaskCommand>[0]
  | Parameters<typeof handleProjectCommand>[0]
  | Parameters<typeof handleResourceCommand>[0]
  | Parameters<typeof handleBalanceRuleCommand>[0];

const CATEGORY_COMMANDS = new Set(['CreateCategory', 'UpdateCategory', 'DeleteCategory']);
const ITEM_COMMANDS = new Set(['CreateItem', 'MarkItemAvailable', 'MarkItemConsumed', 'MarkItemAvailableAgain']);
const TASK_COMMANDS = new Set(['CreateTask', 'StartTask', 'CompleteTask', 'PromoteToProject', 'AddItemRequirement', 'AttachResourceToTask', 'DetachResourceFromTask', 'SetTaskRecurrence', 'SkipRecurrence', 'ScheduleTask']);
const PROJECT_COMMANDS = new Set(['CreateProject', 'AddTaskToProject', 'CompleteProject']);
const RESOURCE_COMMANDS = new Set(['CreateResource', 'UpdateResource', 'DeleteResource']);
const BALANCE_RULE_COMMANDS = new Set(['CreateBalanceRule', 'UpdateBalanceRule', 'DeleteBalanceRule']);

function getAggregateId(command: AnyCommand): string {
  const p = command.payload as Record<string, string>;
  return p.id ?? p.taskId ?? p.projectId ?? p.resourceId;
}

export class CommandBus {
  constructor(private eventStore: EventStore, private pool: Pool) {}

  async dispatch(command: AnyCommand): Promise<StoredEvent[]> {
    const aggregateId = getAggregateId(command);
    const history = await this.eventStore.getEvents(aggregateId);
    const expectedVersion = history.length > 0 ? history[history.length - 1].version : 0;

    let newEvents: ReturnType<typeof handleCategoryCommand>;

    if (CATEGORY_COMMANDS.has(command.type)) {
      newEvents = handleCategoryCommand(command as Parameters<typeof handleCategoryCommand>[0], history);
    } else if (ITEM_COMMANDS.has(command.type)) {
      newEvents = handleItemCommand(command as Parameters<typeof handleItemCommand>[0], history);
    } else if (TASK_COMMANDS.has(command.type)) {
      newEvents = handleTaskCommand(command as Parameters<typeof handleTaskCommand>[0], history);
    } else if (PROJECT_COMMANDS.has(command.type)) {
      newEvents = handleProjectCommand(command as Parameters<typeof handleProjectCommand>[0], history);
    } else if (RESOURCE_COMMANDS.has(command.type)) {
      newEvents = handleResourceCommand(command as Parameters<typeof handleResourceCommand>[0], history);
    } else if (BALANCE_RULE_COMMANDS.has(command.type)) {
      newEvents = handleBalanceRuleCommand(command as Parameters<typeof handleBalanceRuleCommand>[0], history);
    } else {
      throw new Error(`Unknown command type: ${(command as { type: string }).type}`);
    }

    const stored = await this.eventStore.append(newEvents as Parameters<typeof this.eventStore.append>[0], expectedVersion);
    await runProjectors(stored, this.pool);
    return stored;
  }
}
```

- [ ] **Step 3: Run all backend tests**

```bash
cd packages/backend && npx vitest run
```

Expected: All tests passing (note: command-bus tests need pool passed — update test to pass pool).

- [ ] **Step 4: Update `packages/backend/tests/command-bus/command-bus.test.ts`** to pass pool to CommandBus

```typescript
// Change: bus = new CommandBus(store);
// To:
bus = new CommandBus(store, pool);
```

- [ ] **Step 5: Run all tests again**

```bash
cd packages/backend && npx vitest run
```

Expected: All tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/projections/runner.ts packages/backend/src/command-bus/command-bus.ts packages/backend/tests/command-bus/command-bus.test.ts
git commit -m "feat: projector runner wired into command bus — synchronous projections"
```

---

**Phase 2 complete.** All 8 projectors implemented. Every command now automatically updates read-model tables synchronously. Task status is always derived correctly from item availability and task state.

Next: `2026-06-14-gtd-core-phase3-api-seed.md` — Express API routes, seed data, and backend entry point.
