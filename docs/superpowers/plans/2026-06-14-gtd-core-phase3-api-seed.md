# GTD Core — Phase 3: API, Seed & Backend Entry

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Express REST API (commands route + query routes for all entities), seed data for default categories and balance rules, and the backend server entry point. After this phase the backend is fully functional.

**Architecture:** Single `/commands` POST endpoint dispatches any command via CommandBus. Separate GET routes per entity query the projection tables directly. Seed script runs at startup to ensure Health and Study categories + balance rules exist.

**Prerequisite:** Phases 1 and 2 complete. PostgreSQL running with all tables created.

---

### Task 14: Commands API route

**Files:**
- Create: `packages/backend/src/api/routes/commands.router.ts`
- Create: `packages/backend/src/api/middleware/error-handler.ts`

- [ ] **Step 1: Write `packages/backend/src/api/middleware/error-handler.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err.message);
  const status = err.message.includes('not found') ? 404
    : err.message.includes('Concurrency') ? 409
    : err.message.includes('Cannot delete') ? 400
    : 500;
  res.status(status).json({ error: err.message });
}
```

- [ ] **Step 2: Write `packages/backend/src/api/routes/commands.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { CommandBus } from '../../command-bus/command-bus';

export function makeCommandsRouter(bus: CommandBus): Router {
  const router = Router();

  router.post('/:type', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const command = { type: req.params.type, payload: req.body } as Parameters<typeof bus.dispatch>[0];
      const events = await bus.dispatch(command);
      res.status(201).json({ events: events.map(e => ({ id: e.id, eventType: e.eventType, aggregateId: e.aggregateId })) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/
git commit -m "feat: commands API route POST /commands/:type"
```

---

### Task 15: Query API routes

**Files:**
- Create: `packages/backend/src/api/routes/tasks.router.ts`
- Create: `packages/backend/src/api/routes/items.router.ts`
- Create: `packages/backend/src/api/routes/categories.router.ts`
- Create: `packages/backend/src/api/routes/projects.router.ts`
- Create: `packages/backend/src/api/routes/resources.router.ts`
- Create: `packages/backend/src/api/routes/balance.router.ts`
- Create: `packages/backend/src/api/routes/dashboard.router.ts`
- Create: `packages/backend/src/api/routes/suggest.router.ts`

- [ ] **Step 1: Write `packages/backend/src/api/routes/tasks.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeTasksRouter(pool: Pool): Router {
  const router = Router();

  // GET /tasks?status=ready&categoryId=xxx&sort=dueDate
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, categoryId, sort } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (status) { conditions.push(`t.status = $${params.length + 1}`); params.push(status); }
      if (categoryId) { conditions.push(`t.category_id = $${params.length + 1}`); params.push(categoryId); }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderBy = sort === 'duration' ? 'estimated_duration_value ASC NULLS LAST'
        : sort === 'category' ? 't.category_id ASC'
        : 'due_date ASC NULLS LAST';
      const result = await pool.query(
        `SELECT t.*,
                json_agg(DISTINCT jsonb_build_object('itemId', ti.item_id, 'consumable', ti.consumable, 'itemStatus', ti.item_status))
                  FILTER (WHERE ti.item_id IS NOT NULL) as required_items,
                json_agg(DISTINCT jsonb_build_object('resourceId', tr.resource_id, 'title', tr.title, 'type', tr.type))
                  FILTER (WHERE tr.resource_id IS NOT NULL) as resources
         FROM tasks_view t
         LEFT JOIN task_items_view ti ON ti.task_id = t.id
         LEFT JOIN task_resources_view tr ON tr.task_id = t.id
         ${where}
         GROUP BY t.id
         ORDER BY ${orderBy}`,
        params
      );
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  // GET /tasks/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT t.*,
                json_agg(DISTINCT jsonb_build_object('itemId', ti.item_id, 'consumable', ti.consumable, 'itemStatus', ti.item_status))
                  FILTER (WHERE ti.item_id IS NOT NULL) as required_items,
                json_agg(DISTINCT jsonb_build_object('resourceId', tr.resource_id, 'title', tr.title, 'type', tr.type))
                  FILTER (WHERE tr.resource_id IS NOT NULL) as resources
         FROM tasks_view t
         LEFT JOIN task_items_view ti ON ti.task_id = t.id
         LEFT JOIN task_resources_view tr ON tr.task_id = t.id
         WHERE t.id = $1
         GROUP BY t.id`,
        [req.params.id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Task not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 2: Write `packages/backend/src/api/routes/items.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeItemsRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, categoryId } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
      if (categoryId) { conditions.push(`category_id = $${params.length + 1}`); params.push(categoryId); }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(`SELECT * FROM items_view ${where} ORDER BY name ASC`, params);
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM items_view WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: 'Item not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 3: Write `packages/backend/src/api/routes/categories.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeCategoriesRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM categories_view WHERE deleted = false ORDER BY name ASC');
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM categories_view WHERE id = $1 AND deleted = false', [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: 'Category not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 4: Write `packages/backend/src/api/routes/projects.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeProjectsRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, categoryId } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
      if (categoryId) { conditions.push(`category_id = $${params.length + 1}`); params.push(categoryId); }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(`SELECT * FROM projects_view ${where} ORDER BY created_at DESC`, params);
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM projects_view WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: 'Project not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 5: Write `packages/backend/src/api/routes/resources.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeResourcesRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, categoryId, q } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (type) { conditions.push(`type = $${params.length + 1}`); params.push(type); }
      if (categoryId) { conditions.push(`category_id = $${params.length + 1}`); params.push(categoryId); }
      if (q) { conditions.push(`(title ILIKE $${params.length + 1} OR notes ILIKE $${params.length + 1})`); params.push(`%${q}%`); }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(`SELECT * FROM resources_view ${where} ORDER BY created_at DESC`, params);
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM resources_view WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: 'Resource not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 6: Write `packages/backend/src/api/routes/balance.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeBalanceRouter(pool: Pool): Router {
  const router = Router();

  router.get('/rules', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM balance_rules_view ORDER BY frequency ASC');
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT bs.*, c.name as category_name, c.icon as category_icon
         FROM balance_status_view bs
         LEFT JOIN categories_view c ON c.id = bs.category_id
         ORDER BY bs.frequency ASC`
      );
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/status/unmet', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT bs.*, c.name as category_name, c.icon as category_icon
         FROM balance_status_view bs
         LEFT JOIN categories_view c ON c.id = bs.category_id
         WHERE bs.is_met = false
         ORDER BY bs.frequency ASC`
      );
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 7: Write `packages/backend/src/api/routes/dashboard.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeDashboardRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [dashboard, balance, upNext] = await Promise.all([
        pool.query('SELECT * FROM dashboard_view WHERE id = 1'),
        pool.query(`SELECT bs.*, c.name as category_name, c.icon as category_icon
                    FROM balance_status_view bs
                    LEFT JOIN categories_view c ON c.id = bs.category_id`),
        pool.query(`SELECT * FROM tasks_view WHERE status = 'ready'
                    ORDER BY due_date ASC NULLS LAST LIMIT 5`),
      ]);
      res.json({
        counts: dashboard.rows[0],
        balanceStatus: balance.rows,
        upNext: upNext.rows,
      });
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 8: Write `packages/backend/src/api/routes/suggest.router.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeSuggestRouter(pool: Pool): Router {
  const router = Router();

  // GET /suggest?hours=2&categoryId=xxx
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = parseFloat((req.query.hours as string) ?? '0');
      const categoryId = req.query.categoryId as string | undefined;

      // Get unmet balance rules to find priority categories
      const unmetRes = await pool.query('SELECT category_id FROM balance_status_view WHERE is_met = false');
      const priorityCategoryIds = new Set(unmetRes.rows.map((r: { category_id: string }) => r.category_id));

      const conditions = [`status = 'ready'`];
      const params: unknown[] = [];

      if (hours > 0) {
        conditions.push(`(estimated_duration_value IS NULL OR (estimated_duration_unit = 'hour' AND estimated_duration_value <= $${params.length + 1}) OR (estimated_duration_unit = 'day' AND estimated_duration_value * 8 <= $${params.length + 1}))`);
        params.push(hours);
      }
      if (categoryId) {
        conditions.push(`category_id = $${params.length + 1}`);
        params.push(categoryId);
      }

      const result = await pool.query(
        `SELECT * FROM tasks_view WHERE ${conditions.join(' AND ')} ORDER BY due_date ASC NULLS LAST`,
        params
      );

      // Sort: priority (unmet balance) categories first, then by due date
      const tasks = result.rows.sort((a: { category_id: string; due_date: string | null }, b: { category_id: string; due_date: string | null }) => {
        const aPriority = priorityCategoryIds.has(a.category_id) ? 0 : 1;
        const bPriority = priorityCategoryIds.has(b.category_id) ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      res.json(tasks);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 9: Commit**

```bash
git add packages/backend/src/api/routes/
git commit -m "feat: all query API routes (tasks, items, categories, projects, resources, balance, dashboard, suggest)"
```

---

### Task 16: Seed data

**Files:**
- Create: `packages/backend/src/seed/seed.ts`

- [ ] **Step 1: Write `packages/backend/src/seed/seed.ts`**

```typescript
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { CommandBus } from '../command-bus/command-bus';

export async function seed(bus: CommandBus, pool: Pool): Promise<void> {
  // Check if Health category exists
  const existing = await pool.query(`SELECT id FROM categories_view WHERE name IN ('Health', 'Study') AND is_default = true`);
  if (existing.rows.length >= 2) return; // Already seeded

  // Create built-in categories
  const healthId = uuidv4();
  const studyId = uuidv4();

  await bus.dispatch({ type: 'CreateCategory', payload: { id: healthId, name: 'Health', icon: '💪', color: '#ef4444', isDefault: true } });
  await bus.dispatch({ type: 'CreateCategory', payload: { id: studyId, name: 'Study', icon: '📚', color: '#8b5cf6', isDefault: true } });

  // Create default balance rules for built-in categories
  await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: healthId, minimumCount: 1, frequency: 'daily', dayRestriction: null } });
  await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: studyId, minimumCount: 1, frequency: 'daily', dayRestriction: null } });

  // Check if user has Home/Cars categories and seed their balance rules
  const userCats = await pool.query(`SELECT id, name FROM categories_view WHERE name IN ('Home', 'Cars') AND is_default = false`);
  for (const cat of userCats.rows) {
    const existingRule = await pool.query('SELECT id FROM balance_rules_view WHERE category_id = $1', [cat.id]);
    if (existingRule.rows.length > 0) continue;

    if (cat.name === 'Home') {
      await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: cat.id, minimumCount: 1, frequency: 'weekly', dayRestriction: 'weekend' } });
    } else if (cat.name === 'Cars') {
      await bus.dispatch({ type: 'CreateBalanceRule', payload: { id: uuidv4(), categoryId: cat.id, minimumCount: 1, frequency: 'monthly', dayRestriction: null } });
    }
  }

  console.log('Seed complete: Health and Study categories + balance rules created');
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/seed/
git commit -m "feat: seed Health and Study categories with default balance rules"
```

---

### Task 17: Backend server entry point

**Files:**
- Create: `packages/backend/src/index.ts`

- [ ] **Step 1: Write `packages/backend/src/index.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getPool } from './db/client';
import { EventStore } from './event-store/event-store';
import { CommandBus } from './command-bus/command-bus';
import { makeCommandsRouter } from './api/routes/commands.router';
import { makeTasksRouter } from './api/routes/tasks.router';
import { makeItemsRouter } from './api/routes/items.router';
import { makeCategoriesRouter } from './api/routes/categories.router';
import { makeProjectsRouter } from './api/routes/projects.router';
import { makeResourcesRouter } from './api/routes/resources.router';
import { makeBalanceRouter } from './api/routes/balance.router';
import { makeDashboardRouter } from './api/routes/dashboard.router';
import { makeSuggestRouter } from './api/routes/suggest.router';
import { errorHandler } from './api/middleware/error-handler';
import { seed } from './seed/seed';

async function main() {
  const pool = getPool();
  const eventStore = new EventStore(pool);
  const bus = new CommandBus(eventStore, pool);

  await seed(bus, pool);

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());

  app.use('/commands', makeCommandsRouter(bus));
  app.use('/tasks', makeTasksRouter(pool));
  app.use('/items', makeItemsRouter(pool));
  app.use('/categories', makeCategoriesRouter(pool));
  app.use('/projects', makeProjectsRouter(pool));
  app.use('/resources', makeResourcesRouter(pool));
  app.use('/balance', makeBalanceRouter(pool));
  app.use('/dashboard', makeDashboardRouter(pool));
  app.use('/suggest', makeSuggestRouter(pool));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);

  const port = process.env.PORT ?? 3001;
  app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
}

main().catch(console.error);
```

- [ ] **Step 2: Run migrations and start the server**

```bash
cd packages/backend && npx ts-node --esm src/db/migrate.ts
cd packages/backend && npx ts-node --esm src/index.ts
```

Expected output:
```
Seed complete: Health and Study categories + balance rules created
Backend running on http://localhost:3001
```

- [ ] **Step 3: Smoke-test the API**

```bash
curl http://localhost:3001/health
# Expected: {"ok":true}

curl http://localhost:3001/categories
# Expected: JSON array with Health and Study categories

curl http://localhost:3001/dashboard
# Expected: JSON with counts and balanceStatus

curl -X POST http://localhost:3001/commands/CreateTask \
  -H "Content-Type: application/json" \
  -d '{"id":"test-task-1","name":"Test task","categoryId":"<health-category-id-from-categories-response>"}'
# Expected: {"events":[{"id":...,"eventType":"TaskCreated","aggregateId":"test-task-1"}]}

curl "http://localhost:3001/tasks?status=ready"
# Expected: JSON array containing the test task with status "ready"
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/index.ts
git commit -m "feat: Express server entry with all routes and seed"
```

---

**Phase 3 complete.** The backend is fully functional. All commands can be dispatched via `POST /commands/:type`. All projection data is queryable via GET routes. Seed ensures Health and Study categories exist on every startup.

Next: `2026-06-14-gtd-core-phase4-frontend-mcp.md` — React frontend (7 screens) + MCP server (9 tools).
