# API Query Route Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unit/integration test coverage for the 8 untested query routers in `packages/backend/src/api/routes/` (`tasks`, `items`, `categories`, `projects`, `resources`, `balance`, `dashboard`, `suggest`), following the pattern already established in `commands.router.spec.ts`.

**Architecture:** Each router is a thin Express adapter over a query-service port (`I*QueryService`), wrapped in `asyncHandler`, throwing `AppError` for 404s. Each test file boots a real minimal Express app (`express.json()` + the router under test + `errorHandler`), mocks the query-service port with `vi.fn()`, and drives requests with the global `fetch` against an ephemeral `app.listen(0)` server — no `supertest` dependency, matching `commands.router.spec.ts`.

**Important deviation from standard TDD:** These routers already exist and are already correct — there is no new behavior to implement, so there is no red phase. Each task is "write the test, run it, confirm it passes for the right reason (asserts real request/response behavior, not a tautology), commit." Do **not** modify the router source files in this plan — if a test fails, the test is wrong, not the router (unless an actual bug is found, in which case stop and report it instead of silently fixing the router).

**Tech Stack:** TypeScript, Express, vitest, Node's built-in `fetch`, no new dependencies.

---

### Task 1: Tasks router tests

**Files:**
- Create: `packages/backend/src/api/routes/tasks.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/tasks.router.ts`, `packages/backend/src/application/ports/ITaskQueryService.ts`, `packages/backend/src/api/middleware/error-handler.ts`, `packages/backend/src/api/errors/app-error.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ITaskQueryService, TaskView } from '../../application/ports/ITaskQueryService';
import { makeTasksRouter } from './tasks.router';
import { errorHandler } from '../middleware/error-handler';

function makeTaskView(overrides: Partial<TaskView> = {}): TaskView {
  return {
    id: 'task-1',
    name: 'Buy milk',
    description: null,
    category_id: 'cat-1',
    project_id: null,
    status: 'ready',
    estimated_duration_value: null,
    estimated_duration_unit: null,
    due_date: null,
    scheduled_date: null,
    scheduled_start_time: null,
    recurrence_rule: null,
    next_due_date: null,
    completion_count: 0,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    required_items: null,
    resources: null,
    ...overrides,
  };
}

describe('tasks router', () => {
  let queryService: ITaskQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/tasks', makeTasksRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('passes query params through as a filter and returns the matching tasks', async () => {
    const tasks = [makeTaskView()];
    vi.mocked(queryService.getAll).mockResolvedValue(tasks);

    const res = await fetch(`${baseUrl}/tasks?status=ready&categoryId=cat-1&sort=dueDate`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ status: 'ready', categoryId: 'cat-1', sort: 'dueDate' });
    expect(res.status).toBe(200);
    expect(body).toEqual(tasks);
  });

  it('returns all tasks with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/tasks`);

    expect(queryService.getAll).toHaveBeenCalledWith({ status: undefined, categoryId: undefined, sort: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the task by id when found', async () => {
    const task = makeTaskView({ id: 'task-2' });
    vi.mocked(queryService.getById).mockResolvedValue(task);

    const res = await fetch(`${baseUrl}/tasks/task-2`);

    expect(queryService.getById).toHaveBeenCalledWith('task-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(task);
  });

  it('returns 404 when the task is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/tasks/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Task not found' });
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/tasks.router.spec.ts`
Expected: `4 tests passed`. If any test fails, fix the test (not the router) — re-read `tasks.router.ts` and `ITaskQueryService.ts` to correct field names or expectations.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/tasks.router.spec.ts
git commit -m "test: add coverage for tasks router"
```

---

### Task 2: Items router tests

**Files:**
- Create: `packages/backend/src/api/routes/items.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/items.router.ts`, `packages/backend/src/application/ports/IItemQueryService.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IItemQueryService, ItemView } from '../../application/ports/IItemQueryService';
import { makeItemsRouter } from './items.router';
import { errorHandler } from '../middleware/error-handler';

function makeItemView(overrides: Partial<ItemView> = {}): ItemView {
  return {
    id: 'item-1',
    name: 'Milk',
    description: null,
    category_id: 'cat-1',
    status: 'to_buy',
    quantity: 1,
    price: null,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('items router', () => {
  let queryService: IItemQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/items', makeItemsRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('passes query params through as a filter and returns the matching items', async () => {
    const items = [makeItemView()];
    vi.mocked(queryService.getAll).mockResolvedValue(items);

    const res = await fetch(`${baseUrl}/items?status=to_buy&categoryId=cat-1`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ status: 'to_buy', categoryId: 'cat-1' });
    expect(res.status).toBe(200);
    expect(body).toEqual(items);
  });

  it('returns all items with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/items`);

    expect(queryService.getAll).toHaveBeenCalledWith({ status: undefined, categoryId: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the item by id when found', async () => {
    const item = makeItemView({ id: 'item-2' });
    vi.mocked(queryService.getById).mockResolvedValue(item);

    const res = await fetch(`${baseUrl}/items/item-2`);

    expect(queryService.getById).toHaveBeenCalledWith('item-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(item);
  });

  it('returns 404 when the item is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/items/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Item not found' });
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/items.router.spec.ts`
Expected: `4 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/items.router.spec.ts
git commit -m "test: add coverage for items router"
```

---

### Task 3: Categories router tests

**Files:**
- Create: `packages/backend/src/api/routes/categories.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/categories.router.ts`, `packages/backend/src/application/ports/ICategoryQueryService.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ICategoryQueryService, CategoryView } from '../../application/ports/ICategoryQueryService';
import { makeCategoriesRouter } from './categories.router';
import { errorHandler } from '../middleware/error-handler';

function makeCategoryView(overrides: Partial<CategoryView> = {}): CategoryView {
  return {
    id: 'cat-1',
    name: 'Health',
    icon: 'heart',
    color: '#ff0000',
    is_default: false,
    task_count: 0,
    item_count: 0,
    deleted: false,
    ...overrides,
  };
}

describe('categories router', () => {
  let queryService: ICategoryQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/categories', makeCategoriesRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns all categories', async () => {
    const categories = [makeCategoryView()];
    vi.mocked(queryService.getAll).mockResolvedValue(categories);

    const res = await fetch(`${baseUrl}/categories`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith();
    expect(res.status).toBe(200);
    expect(body).toEqual(categories);
  });

  it('returns the category by id when found', async () => {
    const category = makeCategoryView({ id: 'cat-2' });
    vi.mocked(queryService.getById).mockResolvedValue(category);

    const res = await fetch(`${baseUrl}/categories/cat-2`);

    expect(queryService.getById).toHaveBeenCalledWith('cat-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(category);
  });

  it('returns 404 when the category is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/categories/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Category not found' });
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/categories.router.spec.ts`
Expected: `3 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/categories.router.spec.ts
git commit -m "test: add coverage for categories router"
```

---

### Task 4: Projects router tests

**Files:**
- Create: `packages/backend/src/api/routes/projects.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/projects.router.ts`, `packages/backend/src/application/ports/IProjectQueryService.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IProjectQueryService, ProjectView } from '../../application/ports/IProjectQueryService';
import { makeProjectsRouter } from './projects.router';
import { errorHandler } from '../middleware/error-handler';

function makeProjectView(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 'proj-1',
    name: 'Renovate kitchen',
    description: null,
    category_id: 'cat-1',
    status: 'active',
    due_date: null,
    task_ids: [],
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('projects router', () => {
  let queryService: IProjectQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/projects', makeProjectsRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('passes query params through as a filter and returns the matching projects', async () => {
    const projects = [makeProjectView()];
    vi.mocked(queryService.getAll).mockResolvedValue(projects);

    const res = await fetch(`${baseUrl}/projects?status=active&categoryId=cat-1`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ status: 'active', categoryId: 'cat-1' });
    expect(res.status).toBe(200);
    expect(body).toEqual(projects);
  });

  it('returns all projects with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/projects`);

    expect(queryService.getAll).toHaveBeenCalledWith({ status: undefined, categoryId: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the project by id when found', async () => {
    const project = makeProjectView({ id: 'proj-2' });
    vi.mocked(queryService.getById).mockResolvedValue(project);

    const res = await fetch(`${baseUrl}/projects/proj-2`);

    expect(queryService.getById).toHaveBeenCalledWith('proj-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(project);
  });

  it('returns 404 when the project is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/projects/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Project not found' });
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/projects.router.spec.ts`
Expected: `4 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/projects.router.spec.ts
git commit -m "test: add coverage for projects router"
```

---

### Task 5: Resources router tests

**Files:**
- Create: `packages/backend/src/api/routes/resources.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/resources.router.ts`, `packages/backend/src/application/ports/IResourceQueryService.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IResourceQueryService, ResourceView } from '../../application/ports/IResourceQueryService';
import { makeResourcesRouter } from './resources.router';
import { errorHandler } from '../middleware/error-handler';

function makeResourceView(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'res-1',
    title: 'Doctor article',
    type: 'link',
    url: 'https://example.com',
    notes: null,
    category_id: 'cat-1',
    task_ids: [],
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('resources router', () => {
  let queryService: IResourceQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/resources', makeResourcesRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('passes query params through as a filter and returns the matching resources', async () => {
    const resources = [makeResourceView()];
    vi.mocked(queryService.getAll).mockResolvedValue(resources);

    const res = await fetch(`${baseUrl}/resources?type=link&categoryId=cat-1&q=doctor`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ type: 'link', categoryId: 'cat-1', q: 'doctor' });
    expect(res.status).toBe(200);
    expect(body).toEqual(resources);
  });

  it('returns all resources with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/resources`);

    expect(queryService.getAll).toHaveBeenCalledWith({ type: undefined, categoryId: undefined, q: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the resource by id when found', async () => {
    const resource = makeResourceView({ id: 'res-2' });
    vi.mocked(queryService.getById).mockResolvedValue(resource);

    const res = await fetch(`${baseUrl}/resources/res-2`);

    expect(queryService.getById).toHaveBeenCalledWith('res-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(resource);
  });

  it('returns 404 when the resource is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/resources/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Resource not found' });
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/resources.router.spec.ts`
Expected: `4 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/resources.router.spec.ts
git commit -m "test: add coverage for resources router"
```

---

### Task 6: Balance router tests

**Files:**
- Create: `packages/backend/src/api/routes/balance.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/balance.router.ts`, `packages/backend/src/application/ports/IBalanceQueryService.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IBalanceQueryService, BalanceRuleView, BalanceStatusView } from '../../application/ports/IBalanceQueryService';
import { makeBalanceRouter } from './balance.router';
import { errorHandler } from '../middleware/error-handler';

function makeBalanceRuleView(overrides: Partial<BalanceRuleView> = {}): BalanceRuleView {
  return {
    id: 'rule-1',
    category_id: 'cat-1',
    minimum_count: 2,
    frequency: 'weekly',
    day_restriction: null,
    ...overrides,
  };
}

function makeBalanceStatusView(overrides: Partial<BalanceStatusView> = {}): BalanceStatusView {
  return {
    rule_id: 'rule-1',
    category_id: 'cat-1',
    frequency: 'weekly',
    target_count: 2,
    actual_count: 1,
    is_met: false,
    period_start: '2026-01-01T00:00:00.000Z',
    period_end: '2026-01-08T00:00:00.000Z',
    category_name: 'Health',
    category_icon: 'heart',
    ...overrides,
  };
}

describe('balance router', () => {
  let queryService: IBalanceQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getRules: vi.fn(), getStatus: vi.fn(), getUnmetStatus: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/balance', makeBalanceRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns all balance rules', async () => {
    const rules = [makeBalanceRuleView()];
    vi.mocked(queryService.getRules).mockResolvedValue(rules);

    const res = await fetch(`${baseUrl}/balance/rules`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rules);
  });

  it('returns all balance status entries', async () => {
    const status = [makeBalanceStatusView()];
    vi.mocked(queryService.getStatus).mockResolvedValue(status);

    const res = await fetch(`${baseUrl}/balance/status`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(status);
  });

  it('returns only unmet balance status entries', async () => {
    const unmet = [makeBalanceStatusView({ is_met: false })];
    vi.mocked(queryService.getUnmetStatus).mockResolvedValue(unmet);

    const res = await fetch(`${baseUrl}/balance/status/unmet`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(unmet);
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/balance.router.spec.ts`
Expected: `3 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/balance.router.spec.ts
git commit -m "test: add coverage for balance router"
```

---

### Task 7: Dashboard router tests

**Files:**
- Create: `packages/backend/src/api/routes/dashboard.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/dashboard.router.ts`, `packages/backend/src/application/ports/IDashboardQueryService.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IDashboardQueryService, DashboardView } from '../../application/ports/IDashboardQueryService';
import { makeDashboardRouter } from './dashboard.router';
import { errorHandler } from '../middleware/error-handler';

function makeDashboardView(overrides: Partial<DashboardView> = {}): DashboardView {
  return {
    counts: {
      id: 1,
      ready_count: 1,
      ongoing_count: 0,
      pending_count: 0,
      planned_count: 0,
      to_buy_count: 0,
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    balanceStatus: [],
    upNext: [],
    ...overrides,
  };
}

describe('dashboard router', () => {
  let queryService: IDashboardQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { get: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/dashboard', makeDashboardRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns the dashboard view', async () => {
    const dashboard = makeDashboardView();
    vi.mocked(queryService.get).mockResolvedValue(dashboard);

    const res = await fetch(`${baseUrl}/dashboard`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(dashboard);
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/dashboard.router.spec.ts`
Expected: `1 test passed`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/dashboard.router.spec.ts
git commit -m "test: add coverage for dashboard router"
```

---

### Task 8: Suggest router tests

**Files:**
- Create: `packages/backend/src/api/routes/suggest.router.spec.ts`
- Reference (read-only, do not modify): `packages/backend/src/api/routes/suggest.router.ts`, `packages/backend/src/application/ports/ISuggestQueryService.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ISuggestQueryService, SuggestedTaskView } from '../../application/ports/ISuggestQueryService';
import { makeSuggestRouter } from './suggest.router';
import { errorHandler } from '../middleware/error-handler';

function makeSuggestedTaskView(overrides: Partial<SuggestedTaskView> = {}): SuggestedTaskView {
  return {
    id: 'task-1',
    name: 'Buy milk',
    category_id: 'cat-1',
    status: 'ready',
    due_date: null,
    estimated_duration_value: null,
    estimated_duration_unit: null,
    ...overrides,
  };
}

describe('suggest router', () => {
  let queryService: ISuggestQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { suggest: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/suggest', makeSuggestRouter(queryService));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('parses hours as a float and passes the filter through', async () => {
    const suggestions = [makeSuggestedTaskView()];
    vi.mocked(queryService.suggest).mockResolvedValue(suggestions);

    const res = await fetch(`${baseUrl}/suggest?hours=1.5&categoryId=cat-1`);
    const body = await res.json();

    expect(queryService.suggest).toHaveBeenCalledWith({ hours: 1.5, categoryId: 'cat-1' });
    expect(res.status).toBe(200);
    expect(body).toEqual(suggestions);
  });

  it('leaves hours undefined when no hours query param is given', async () => {
    vi.mocked(queryService.suggest).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/suggest`);

    expect(queryService.suggest).toHaveBeenCalledWith({ hours: undefined, categoryId: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it passes**

Run (from `packages/backend`): `npx vitest run src/api/routes/suggest.router.spec.ts`
Expected: `2 tests passed`.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/api/routes/suggest.router.spec.ts
git commit -m "test: add coverage for suggest router"
```

---

## Final Step: Full Suite Verification

- [ ] After all 8 tasks are complete, run the full backend test suite from `packages/backend`: `npm test`
- [ ] Expected: all test files pass, including the 8 new router specs and the pre-existing `commands.router.spec.ts`.
