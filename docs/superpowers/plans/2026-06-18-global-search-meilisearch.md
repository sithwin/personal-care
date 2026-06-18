# Global Search with Meilisearch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dashboard modal search with a persistent top-bar inline input that delivers live cross-type search (tasks, projects, items) via Meilisearch, kept in sync through the existing projector pipeline.

**Architecture:** Meilisearch runs as a Docker service alongside PostgreSQL. Domain events flow through three new search projectors that call a `MeilisearchSearchIndexer` to upsert/patch documents in a single `personal_care` index. A new `GET /api/v1/search?q=` route queries Meilisearch and returns grouped results. The frontend `TopBar` component replaces the old `CommandBar` modal with an inline input that shows a live dropdown.

**Tech Stack:** Node 20 · TypeScript 5 · Meilisearch (Docker) · `meilisearch` npm SDK · React 18 · TanStack Query · Vitest

## Global Constraints

- All new `.ts` files: no `any`, named exports only, `import type` for type-only imports
- Function declarations for named functions; arrow functions for callbacks
- `===` / `!==` always
- Express routes: `asyncHandler` wrapper, `AppError(message, statusCode)` for HTTP errors
- Test files: `.spec.ts` extension, co-located with source
- Search projector tests use a mock `ISearchIndexer` (no real Meilisearch required for tests)
- Vite proxy rewrites `/api/<path>` → `/api/v1/<path>` (except `/api/commands`)

---

## File Map

**New files — backend:**
- `packages/backend/src/config/env.ts` — Zod-validated Meilisearch env vars
- `packages/backend/src/application/ports/ISearchIndexer.ts` — port: upsert, patch, delete, bootstrap, getDocumentCount
- `packages/backend/src/application/ports/ISearchQueryService.ts` — port: search(q)
- `packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.ts` — Meilisearch adapter
- `packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.spec.ts`
- `packages/backend/src/infrastructure/search/bootstrapSearchIndex.ts` — reads PG views, bulk-indexes on cold start
- `packages/backend/src/infrastructure/search/bootstrapSearchIndex.spec.ts`
- `packages/backend/src/infrastructure/projections/tasks-search.projector.ts`
- `packages/backend/src/infrastructure/projections/tasks-search.projector.spec.ts`
- `packages/backend/src/infrastructure/projections/items-search.projector.ts`
- `packages/backend/src/infrastructure/projections/items-search.projector.spec.ts`
- `packages/backend/src/infrastructure/projections/projects-search.projector.ts`
- `packages/backend/src/infrastructure/projections/projects-search.projector.spec.ts`
- `packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.ts`
- `packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.spec.ts`
- `packages/backend/src/api/routes/search.router.ts`
- `packages/backend/src/api/routes/search.router.spec.ts`

**Modified files — backend:**
- `docker-compose.yml` — add `meilisearch` service + volume
- `packages/backend/.env` — add `MEILISEARCH_URL`, `MEILISEARCH_API_KEY`
- `packages/backend/package.json` — add `meilisearch` dependency
- `packages/backend/src/infrastructure/composition-root.ts` — wire indexer, query service, search projectors
- `packages/backend/src/index.ts` — import env.ts, register `/api/v1/search` route, call `bootstrapSearchIndex`

**New files — frontend:**
- `packages/frontend/src/components/layout/TopBar.tsx`

**Modified files — frontend:**
- `packages/frontend/src/api/queries.ts` — add `SearchHit`, `SearchResults`, `useSearch`
- `packages/frontend/src/App.tsx` — add `TopBar` to layout
- `packages/frontend/src/pages/Dashboard.tsx` — remove `CommandBar`

**Deleted files — frontend:**
- `packages/frontend/src/components/layout/CommandBar.tsx`

---

## Task 1: Infrastructure — Docker, Env, Package

**Files:**
- Modify: `docker-compose.yml`
- Modify: `packages/backend/.env`
- Modify: `packages/backend/package.json`
- Create: `packages/backend/src/config/env.ts`

**Interfaces:**
- Produces: `env.MEILISEARCH_URL: string`, `env.MEILISEARCH_API_KEY: string` consumed by Tasks 2 and 5

- [ ] **Step 1: Add Meilisearch to docker-compose.yml**

Replace the entire file:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: personal_care
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  meilisearch:
    image: getmeili/meilisearch:latest
    environment:
      MEILI_MASTER_KEY: dev_master_key
    ports:
      - "7700:7700"
    volumes:
      - meilisearch_data:/meili_data
volumes:
  postgres_data:
  meilisearch_data:
```

- [ ] **Step 2: Add env vars to packages/backend/.env**

Append to the existing file:

```
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=dev_master_key
```

- [ ] **Step 3: Add meilisearch SDK to backend package.json**

```bash
cd packages/backend && npm install meilisearch
```

Expected: `meilisearch` appears in `package.json` dependencies.

- [ ] **Step 4: Create packages/backend/src/config/env.ts**

```ts
import { z } from 'zod';

const schema = z.object({
  MEILISEARCH_URL: z.string().url(),
  MEILISEARCH_API_KEY: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
```

- [ ] **Step 5: Verify z is available (zod is already a dependency)**

```bash
cd packages/backend && node -e "require('zod')"
```

Expected: no error.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml packages/backend/.env packages/backend/package.json packages/backend/package-lock.json packages/backend/src/config/env.ts
git commit -m "feat(search): add Meilisearch infrastructure, env config, and SDK"
```

---

## Task 2: ISearchIndexer Port + MeilisearchSearchIndexer Adapter

**Files:**
- Create: `packages/backend/src/application/ports/ISearchIndexer.ts`
- Create: `packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.ts`
- Create: `packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.spec.ts`

**Interfaces:**
- Produces:
  - `SearchDocument` interface — consumed by Tasks 3, 4, 5
  - `ISearchIndexer` interface — consumed by Tasks 3, 4, 7
  - `MeilisearchSearchIndexer` class — consumed by Task 7

- [ ] **Step 1: Create ISearchIndexer port**

```ts
// packages/backend/src/application/ports/ISearchIndexer.ts
export interface SearchDocument {
  id: string;
  entityId: string;
  type: 'task' | 'project' | 'item';
  name: string;
  description: string | null;
  status: string | null;
  categoryId: string | null;
}

export interface ISearchIndexer {
  ensureIndex(): Promise<void>;
  upsert(doc: SearchDocument): Promise<void>;
  patch(id: string, fields: Partial<Omit<SearchDocument, 'id'>>): Promise<void>;
  delete(id: string): Promise<void>;
  bootstrap(docs: SearchDocument[]): Promise<void>;
  getDocumentCount(): Promise<number>;
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDocuments = vi.fn().mockResolvedValue({});
const mockUpdateDocuments = vi.fn().mockResolvedValue({});
const mockDeleteDocument = vi.fn().mockResolvedValue({});
const mockUpdateSettings = vi.fn().mockResolvedValue({});
const mockGetStats = vi.fn().mockResolvedValue({ numberOfDocuments: 0 });
const mockIndex = vi.fn().mockReturnValue({
  addDocuments: mockAddDocuments,
  updateDocuments: mockUpdateDocuments,
  deleteDocument: mockDeleteDocument,
  updateSettings: mockUpdateSettings,
  getStats: mockGetStats,
});

vi.mock('meilisearch', () => ({
  MeiliSearch: vi.fn().mockImplementation(() => ({ index: mockIndex })),
}));

import { MeilisearchSearchIndexer } from './MeilisearchSearchIndexer';
import type { SearchDocument } from '../../application/ports/ISearchIndexer';

const doc: SearchDocument = {
  id: 'task-abc-123',
  entityId: 'abc-123',
  type: 'task',
  name: 'Fix the sink',
  description: null,
  status: 'ready',
  categoryId: 'cat-1',
};

describe('MeilisearchSearchIndexer', () => {
  let indexer: MeilisearchSearchIndexer;

  beforeEach(() => {
    vi.clearAllMocks();
    indexer = new MeilisearchSearchIndexer('http://localhost:7700', 'test_key');
  });

  it('ensureIndex calls updateSettings on the personal_care index', async () => {
    await indexer.ensureIndex();
    expect(mockIndex).toHaveBeenCalledWith('personal_care');
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      searchableAttributes: ['name', 'description'],
      filterableAttributes: ['type', 'status', 'categoryId'],
    });
  });

  it('upsert calls addDocuments with the document', async () => {
    await indexer.upsert(doc);
    expect(mockAddDocuments).toHaveBeenCalledWith([doc]);
  });

  it('patch calls updateDocuments with id and fields', async () => {
    await indexer.patch('task-abc-123', { status: 'ongoing' });
    expect(mockUpdateDocuments).toHaveBeenCalledWith([{ id: 'task-abc-123', status: 'ongoing' }]);
  });

  it('delete calls deleteDocument with the id', async () => {
    await indexer.delete('task-abc-123');
    expect(mockDeleteDocument).toHaveBeenCalledWith('task-abc-123');
  });

  it('bootstrap calls addDocuments with all docs', async () => {
    await indexer.bootstrap([doc]);
    expect(mockAddDocuments).toHaveBeenCalledWith([doc]);
  });

  it('bootstrap is a no-op when docs array is empty', async () => {
    await indexer.bootstrap([]);
    expect(mockAddDocuments).not.toHaveBeenCalled();
  });

  it('getDocumentCount returns numberOfDocuments from stats', async () => {
    mockGetStats.mockResolvedValueOnce({ numberOfDocuments: 42 });
    const count = await indexer.getDocumentCount();
    expect(count).toBe(42);
  });

  it('getDocumentCount returns 0 when index does not exist', async () => {
    mockGetStats.mockRejectedValueOnce(new Error('index not found'));
    const count = await indexer.getDocumentCount();
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/backend && npx vitest run src/infrastructure/search/MeilisearchSearchIndexer.spec.ts
```

Expected: FAIL — `Cannot find module './MeilisearchSearchIndexer'`

- [ ] **Step 4: Implement MeilisearchSearchIndexer**

```ts
// packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.ts
import { MeiliSearch } from 'meilisearch';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';

export class MeilisearchSearchIndexer implements ISearchIndexer {
  private readonly client: MeiliSearch;
  private readonly indexName = 'personal_care';

  constructor(url: string, apiKey: string) {
    this.client = new MeiliSearch({ host: url, apiKey });
  }

  async ensureIndex(): Promise<void> {
    await this.client.index(this.indexName).updateSettings({
      searchableAttributes: ['name', 'description'],
      filterableAttributes: ['type', 'status', 'categoryId'],
    });
  }

  async upsert(doc: SearchDocument): Promise<void> {
    await this.client.index(this.indexName).addDocuments([doc]);
  }

  async patch(id: string, fields: Partial<Omit<SearchDocument, 'id'>>): Promise<void> {
    await this.client.index(this.indexName).updateDocuments([{ id, ...fields }]);
  }

  async delete(id: string): Promise<void> {
    await this.client.index(this.indexName).deleteDocument(id);
  }

  async bootstrap(docs: SearchDocument[]): Promise<void> {
    if (docs.length === 0) return;
    await this.client.index(this.indexName).addDocuments(docs);
  }

  async getDocumentCount(): Promise<number> {
    try {
      const stats = await this.client.index(this.indexName).getStats();
      return stats.numberOfDocuments;
    } catch {
      return 0;
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/backend && npx vitest run src/infrastructure/search/MeilisearchSearchIndexer.spec.ts
```

Expected: PASS — 8 tests

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/ports/ISearchIndexer.ts packages/backend/src/infrastructure/search/
git commit -m "feat(search): add ISearchIndexer port and MeilisearchSearchIndexer adapter"
```

---

## Task 3: Search Projectors

**Files:**
- Create: `packages/backend/src/infrastructure/projections/tasks-search.projector.ts`
- Create: `packages/backend/src/infrastructure/projections/tasks-search.projector.spec.ts`
- Create: `packages/backend/src/infrastructure/projections/items-search.projector.ts`
- Create: `packages/backend/src/infrastructure/projections/items-search.projector.spec.ts`
- Create: `packages/backend/src/infrastructure/projections/projects-search.projector.ts`
- Create: `packages/backend/src/infrastructure/projections/projects-search.projector.spec.ts`

**Interfaces:**
- Consumes: `ISearchIndexer` from Task 2, `Projector` type from `application/ports/IProjector.ts`
- Produces:
  - `createTasksSearchProjector(indexer: ISearchIndexer): Projector`
  - `createItemsSearchProjector(indexer: ISearchIndexer): Projector`
  - `createProjectsSearchProjector(indexer: ISearchIndexer): Projector`

- [ ] **Step 1: Write failing tests for tasks-search projector**

```ts
// packages/backend/src/infrastructure/projections/tasks-search.projector.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTasksSearchProjector } from './tasks-search.projector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import type { StoredEvent } from '../../types';

const TASK_ID = '00000000-0000-0000-0000-000000000001';
const CAT_ID  = '00000000-0000-0000-0000-000000000002';

function makeEvent(eventType: string, payload: Record<string, unknown>): StoredEvent {
  return { id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType, payload, version: 1, createdAt: new Date() };
}

describe('tasks-search projector', () => {
  let indexer: ISearchIndexer;
  let projector: ReturnType<typeof createTasksSearchProjector>;

  beforeEach(() => {
    indexer = { ensureIndex: vi.fn(), upsert: vi.fn(), patch: vi.fn(), delete: vi.fn(), bootstrap: vi.fn(), getDocumentCount: vi.fn() };
    projector = createTasksSearchProjector(indexer);
  });

  it('TaskCreated upserts a task document', async () => {
    await projector(makeEvent('TaskCreated', { id: TASK_ID, name: 'Fix sink', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `task-${TASK_ID}`,
      entityId: TASK_ID,
      type: 'task',
      name: 'Fix sink',
      description: null,
      status: 'ready',
      categoryId: CAT_ID,
    });
  });

  it('TaskUpdated upserts with new name and description', async () => {
    await projector(makeEvent('TaskUpdated', { id: TASK_ID, name: 'Fixed sink', description: 'Done', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `task-${TASK_ID}`,
      entityId: TASK_ID,
      type: 'task',
      name: 'Fixed sink',
      description: 'Done',
      status: null,
      categoryId: CAT_ID,
    });
  });

  it('TaskStarted patches status to ongoing', async () => {
    await projector(makeEvent('TaskStarted', { id: TASK_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`task-${TASK_ID}`, { status: 'ongoing' });
  });

  it('TaskCompleted patches status to done', async () => {
    await projector(makeEvent('TaskCompleted', { id: TASK_ID, itemDisposals: [] }));
    expect(indexer.patch).toHaveBeenCalledWith(`task-${TASK_ID}`, { status: 'done' });
  });

  it('ignores unrelated events', async () => {
    await projector(makeEvent('ProjectCreated', { id: TASK_ID }));
    expect(indexer.upsert).not.toHaveBeenCalled();
    expect(indexer.patch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Write failing tests for items-search projector**

```ts
// packages/backend/src/infrastructure/projections/items-search.projector.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createItemsSearchProjector } from './items-search.projector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import type { StoredEvent } from '../../types';

const ITEM_ID = '00000000-0000-0000-0000-000000000001';
const CAT_ID  = '00000000-0000-0000-0000-000000000002';

function makeEvent(eventType: string, payload: Record<string, unknown>): StoredEvent {
  return { id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType, payload, version: 1, createdAt: new Date() };
}

describe('items-search projector', () => {
  let indexer: ISearchIndexer;
  let projector: ReturnType<typeof createItemsSearchProjector>;

  beforeEach(() => {
    indexer = { ensureIndex: vi.fn(), upsert: vi.fn(), patch: vi.fn(), delete: vi.fn(), bootstrap: vi.fn(), getDocumentCount: vi.fn() };
    projector = createItemsSearchProjector(indexer);
  });

  it('ItemCreated upserts an item document', async () => {
    await projector(makeEvent('ItemCreated', { id: ITEM_ID, name: 'Solar lamp', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `item-${ITEM_ID}`,
      entityId: ITEM_ID,
      type: 'item',
      name: 'Solar lamp',
      description: null,
      status: 'to_buy',
      categoryId: CAT_ID,
    });
  });

  it('ItemMarkedAvailable patches status to available', async () => {
    await projector(makeEvent('ItemMarkedAvailable', { id: ITEM_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`item-${ITEM_ID}`, { status: 'available' });
  });

  it('ItemMarkedAvailableAgain patches status to available', async () => {
    await projector(makeEvent('ItemMarkedAvailableAgain', { id: ITEM_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`item-${ITEM_ID}`, { status: 'available' });
  });

  it('ItemMarkedConsumed patches status to consumed', async () => {
    await projector(makeEvent('ItemMarkedConsumed', { id: ITEM_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`item-${ITEM_ID}`, { status: 'consumed' });
  });
});
```

- [ ] **Step 3: Write failing tests for projects-search projector**

```ts
// packages/backend/src/infrastructure/projections/projects-search.projector.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProjectsSearchProjector } from './projects-search.projector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';
import type { StoredEvent } from '../../types';

const PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const CAT_ID     = '00000000-0000-0000-0000-000000000002';

function makeEvent(eventType: string, payload: Record<string, unknown>): StoredEvent {
  return { id: 1, aggregateId: PROJECT_ID, aggregateType: 'project', eventType, payload, version: 1, createdAt: new Date() };
}

describe('projects-search projector', () => {
  let indexer: ISearchIndexer;
  let projector: ReturnType<typeof createProjectsSearchProjector>;

  beforeEach(() => {
    indexer = { ensureIndex: vi.fn(), upsert: vi.fn(), patch: vi.fn(), delete: vi.fn(), bootstrap: vi.fn(), getDocumentCount: vi.fn() };
    projector = createProjectsSearchProjector(indexer);
  });

  it('ProjectCreated upserts a project document', async () => {
    await projector(makeEvent('ProjectCreated', { id: PROJECT_ID, name: 'Home Reno', categoryId: CAT_ID }));
    expect(indexer.upsert).toHaveBeenCalledWith({
      id: `project-${PROJECT_ID}`,
      entityId: PROJECT_ID,
      type: 'project',
      name: 'Home Reno',
      description: null,
      status: 'draft',
      categoryId: CAT_ID,
    });
  });

  it('ProjectUpdated patches name and description', async () => {
    await projector(makeEvent('ProjectUpdated', { id: PROJECT_ID, name: 'Home Renovation', description: 'Full reno' }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { name: 'Home Renovation', description: 'Full reno' });
  });

  it('ProjectStarted patches status to active', async () => {
    await projector(makeEvent('ProjectStarted', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'active' });
  });

  it('ProjectPaused patches status to on_hold', async () => {
    await projector(makeEvent('ProjectPaused', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'on_hold' });
  });

  it('ProjectResumed patches status to active', async () => {
    await projector(makeEvent('ProjectResumed', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'active' });
  });

  it('ProjectCompleted patches status to done', async () => {
    await projector(makeEvent('ProjectCompleted', { id: PROJECT_ID }));
    expect(indexer.patch).toHaveBeenCalledWith(`project-${PROJECT_ID}`, { status: 'done' });
  });
});
```

- [ ] **Step 4: Run all three spec files to verify they fail**

```bash
cd packages/backend && npx vitest run src/infrastructure/projections/tasks-search.projector.spec.ts src/infrastructure/projections/items-search.projector.spec.ts src/infrastructure/projections/projects-search.projector.spec.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 5: Implement tasks-search.projector.ts**

```ts
// packages/backend/src/infrastructure/projections/tasks-search.projector.ts
import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

export function createTasksSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'TaskCreated':
        await indexer.upsert({
          id: `task-${p.id as string}`,
          entityId: p.id as string,
          type: 'task',
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          status: 'ready',
          categoryId: p.categoryId as string,
        });
        break;
      case 'TaskUpdated':
        await indexer.upsert({
          id: `task-${p.id as string}`,
          entityId: p.id as string,
          type: 'task',
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          status: null,
          categoryId: (p.categoryId as string | undefined) ?? null,
        });
        break;
      case 'TaskStarted':
        await indexer.patch(`task-${p.id as string}`, { status: 'ongoing' });
        break;
      case 'TaskCompleted':
        await indexer.patch(`task-${p.id as string}`, { status: 'done' });
        break;
      default:
        break;
    }
  };
}
```

- [ ] **Step 6: Implement items-search.projector.ts**

```ts
// packages/backend/src/infrastructure/projections/items-search.projector.ts
import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

export function createItemsSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ItemCreated':
        await indexer.upsert({
          id: `item-${p.id as string}`,
          entityId: p.id as string,
          type: 'item',
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          status: 'to_buy',
          categoryId: p.categoryId as string,
        });
        break;
      case 'ItemMarkedAvailable':
      case 'ItemMarkedAvailableAgain':
        await indexer.patch(`item-${p.id as string}`, { status: 'available' });
        break;
      case 'ItemMarkedConsumed':
        await indexer.patch(`item-${p.id as string}`, { status: 'consumed' });
        break;
      default:
        break;
    }
  };
}
```

- [ ] **Step 7: Implement projects-search.projector.ts**

```ts
// packages/backend/src/infrastructure/projections/projects-search.projector.ts
import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

export function createProjectsSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ProjectCreated':
        await indexer.upsert({
          id: `project-${p.id as string}`,
          entityId: p.id as string,
          type: 'project',
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          status: 'draft',
          categoryId: p.categoryId as string,
        });
        break;
      case 'ProjectUpdated':
        await indexer.patch(`project-${p.id as string}`, {
          name: (p.name as string | undefined) ?? undefined,
          description: (p.description as string | undefined) ?? undefined,
        });
        break;
      case 'ProjectStarted':
      case 'ProjectResumed':
        await indexer.patch(`project-${p.id as string}`, { status: 'active' });
        break;
      case 'ProjectPaused':
        await indexer.patch(`project-${p.id as string}`, { status: 'on_hold' });
        break;
      case 'ProjectCompleted':
        await indexer.patch(`project-${p.id as string}`, { status: 'done' });
        break;
      default:
        break;
    }
  };
}
```

- [ ] **Step 8: Run all three spec files to verify they pass**

```bash
cd packages/backend && npx vitest run src/infrastructure/projections/tasks-search.projector.spec.ts src/infrastructure/projections/items-search.projector.spec.ts src/infrastructure/projections/projects-search.projector.spec.ts
```

Expected: PASS — 16 tests total

- [ ] **Step 9: Commit**

```bash
git add packages/backend/src/infrastructure/projections/tasks-search.projector.ts packages/backend/src/infrastructure/projections/tasks-search.projector.spec.ts packages/backend/src/infrastructure/projections/items-search.projector.ts packages/backend/src/infrastructure/projections/items-search.projector.spec.ts packages/backend/src/infrastructure/projections/projects-search.projector.ts packages/backend/src/infrastructure/projections/projects-search.projector.spec.ts
git commit -m "feat(search): add tasks, items, and projects search projectors"
```

---

## Task 4: Cold-Start Backfill

**Files:**
- Create: `packages/backend/src/infrastructure/search/bootstrapSearchIndex.ts`
- Create: `packages/backend/src/infrastructure/search/bootstrapSearchIndex.spec.ts`

**Interfaces:**
- Consumes: `ISearchIndexer`, `SearchDocument` from Task 2; `Pool` from `pg`
- Produces: `bootstrapSearchIndex(indexer: ISearchIndexer, pool: Pool): Promise<void>` — consumed by Task 7

- [ ] **Step 1: Write failing tests**

```ts
// packages/backend/src/infrastructure/search/bootstrapSearchIndex.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ISearchIndexer } from '../../application/ports/ISearchIndexer';

const mockQuery = vi.fn();
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({ query: mockQuery })),
}));

import { bootstrapSearchIndex } from './bootstrapSearchIndex';
import { Pool } from 'pg';

describe('bootstrapSearchIndex', () => {
  let indexer: ISearchIndexer;
  let pool: Pool;

  beforeEach(() => {
    indexer = {
      ensureIndex: vi.fn(),
      upsert: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      bootstrap: vi.fn(),
      getDocumentCount: vi.fn().mockResolvedValue(0),
    };
    pool = new Pool();
    vi.clearAllMocks();
    (indexer.getDocumentCount as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  });

  it('calls ensureIndex on every run', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await bootstrapSearchIndex(indexer, pool);
    expect(indexer.ensureIndex).toHaveBeenCalledOnce();
  });

  it('skips bootstrap when index already has documents', async () => {
    (indexer.getDocumentCount as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    await bootstrapSearchIndex(indexer, pool);
    expect(indexer.bootstrap).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('bulk-indexes tasks, items, and projects from PG when index is empty', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'task-1', name: 'Fix sink', description: null, category_id: 'cat-1', status: 'ready' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', name: 'Lamp', description: null, category_id: 'cat-1', status: 'to_buy' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'proj-1', name: 'Reno', description: null, category_id: 'cat-1', status: 'draft' }] });

    await bootstrapSearchIndex(indexer, pool);

    expect(indexer.bootstrap).toHaveBeenCalledWith([
      { id: 'task-task-1', entityId: 'task-1', type: 'task', name: 'Fix sink', description: null, status: 'ready', categoryId: 'cat-1' },
      { id: 'item-item-1', entityId: 'item-1', type: 'item', name: 'Lamp', description: null, status: 'to_buy', categoryId: 'cat-1' },
      { id: 'project-proj-1', entityId: 'proj-1', type: 'project', name: 'Reno', description: null, status: 'draft', categoryId: 'cat-1' },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/backend && npx vitest run src/infrastructure/search/bootstrapSearchIndex.spec.ts
```

Expected: FAIL — `Cannot find module './bootstrapSearchIndex'`

- [ ] **Step 3: Implement bootstrapSearchIndex.ts**

```ts
// packages/backend/src/infrastructure/search/bootstrapSearchIndex.ts
import type { Pool } from 'pg';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';

export async function bootstrapSearchIndex(indexer: ISearchIndexer, pool: Pool): Promise<void> {
  await indexer.ensureIndex();

  const count = await indexer.getDocumentCount();
  if (count > 0) return;

  const [tasks, items, projects] = await Promise.all([
    pool.query<{ id: string; name: string; description: string | null; category_id: string; status: string }>(
      'SELECT id, name, description, category_id, status FROM tasks_view'
    ),
    pool.query<{ id: string; name: string; description: string | null; category_id: string; status: string }>(
      'SELECT id, name, description, category_id, status FROM items_view'
    ),
    pool.query<{ id: string; name: string; description: string | null; category_id: string; status: string }>(
      'SELECT id, name, description, category_id, status FROM projects_view'
    ),
  ]);

  const docs: SearchDocument[] = [
    ...tasks.rows.map(r => ({
      id: `task-${r.id}`,
      entityId: r.id,
      type: 'task' as const,
      name: r.name,
      description: r.description,
      status: r.status,
      categoryId: r.category_id,
    })),
    ...items.rows.map(r => ({
      id: `item-${r.id}`,
      entityId: r.id,
      type: 'item' as const,
      name: r.name,
      description: r.description,
      status: r.status,
      categoryId: r.category_id,
    })),
    ...projects.rows.map(r => ({
      id: `project-${r.id}`,
      entityId: r.id,
      type: 'project' as const,
      name: r.name,
      description: r.description,
      status: r.status,
      categoryId: r.category_id,
    })),
  ];

  await indexer.bootstrap(docs);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/backend && npx vitest run src/infrastructure/search/bootstrapSearchIndex.spec.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/search/bootstrapSearchIndex.ts packages/backend/src/infrastructure/search/bootstrapSearchIndex.spec.ts
git commit -m "feat(search): add cold-start search index bootstrap from PG views"
```

---

## Task 5: ISearchQueryService Port + MeilisearchSearchQueryService Adapter

**Files:**
- Create: `packages/backend/src/application/ports/ISearchQueryService.ts`
- Create: `packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.ts`
- Create: `packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.spec.ts`

**Interfaces:**
- Consumes: `SearchDocument` from Task 2
- Produces:
  - `SearchHit`, `SearchResults`, `ISearchQueryService` — consumed by Task 6, 7
  - `MeilisearchSearchQueryService` class — consumed by Task 7

- [ ] **Step 1: Create ISearchQueryService port**

```ts
// packages/backend/src/application/ports/ISearchQueryService.ts
export interface SearchHit {
  entityId: string;
  type: 'task' | 'project' | 'item';
  name: string;
  status: string | null;
  categoryId: string | null;
}

export interface SearchResults {
  tasks: SearchHit[];
  projects: SearchHit[];
  items: SearchHit[];
}

export interface ISearchQueryService {
  search(q: string): Promise<SearchResults>;
}
```

- [ ] **Step 2: Write failing tests**

```ts
// packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearch = vi.fn();
const mockIndex = vi.fn().mockReturnValue({ search: mockSearch });

vi.mock('meilisearch', () => ({
  MeiliSearch: vi.fn().mockImplementation(() => ({ index: mockIndex })),
}));

import { MeilisearchSearchQueryService } from './MeilisearchSearchQueryService';

describe('MeilisearchSearchQueryService', () => {
  let service: MeilisearchSearchQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MeilisearchSearchQueryService('http://localhost:7700', 'test_key');
  });

  it('returns hits grouped into tasks, projects, items', async () => {
    mockSearch.mockResolvedValueOnce({
      hits: [
        { id: 'task-1', entityId: '1', type: 'task', name: 'Fix sink', status: 'ready', categoryId: 'cat-1' },
        { id: 'project-2', entityId: '2', type: 'project', name: 'Reno', status: 'draft', categoryId: 'cat-1' },
        { id: 'item-3', entityId: '3', type: 'item', name: 'Lamp', status: 'to_buy', categoryId: 'cat-1' },
      ],
    });

    const result = await service.search('fix');

    expect(mockSearch).toHaveBeenCalledWith('fix', { limit: 15 });
    expect(result.tasks).toEqual([{ entityId: '1', type: 'task', name: 'Fix sink', status: 'ready', categoryId: 'cat-1' }]);
    expect(result.projects).toEqual([{ entityId: '2', type: 'project', name: 'Reno', status: 'draft', categoryId: 'cat-1' }]);
    expect(result.items).toEqual([{ entityId: '3', type: 'item', name: 'Lamp', status: 'to_buy', categoryId: 'cat-1' }]);
  });

  it('caps each type at 5 results', async () => {
    const manyTasks = Array.from({ length: 8 }, (_, i) => ({
      id: `task-${i}`, entityId: `${i}`, type: 'task' as const, name: `Task ${i}`, status: 'ready', categoryId: 'cat-1',
    }));
    mockSearch.mockResolvedValueOnce({ hits: manyTasks });

    const result = await service.search('task');
    expect(result.tasks).toHaveLength(5);
  });

  it('returns empty arrays when no results match', async () => {
    mockSearch.mockResolvedValueOnce({ hits: [] });
    const result = await service.search('xyz');
    expect(result).toEqual({ tasks: [], projects: [], items: [] });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/backend && npx vitest run src/infrastructure/queries/MeilisearchSearchQueryService.spec.ts
```

Expected: FAIL — `Cannot find module './MeilisearchSearchQueryService'`

- [ ] **Step 4: Implement MeilisearchSearchQueryService**

```ts
// packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.ts
import { MeiliSearch } from 'meilisearch';
import type { ISearchQueryService, SearchHit, SearchResults } from '../../application/ports/ISearchQueryService';
import type { SearchDocument } from '../../application/ports/ISearchIndexer';

export class MeilisearchSearchQueryService implements ISearchQueryService {
  private readonly client: MeiliSearch;

  constructor(url: string, apiKey: string) {
    this.client = new MeiliSearch({ host: url, apiKey });
  }

  async search(q: string): Promise<SearchResults> {
    const result = await this.client.index('personal_care').search<SearchDocument>(q, { limit: 15 });
    const hits = result.hits;

    function toHit(h: SearchDocument): SearchHit {
      return { entityId: h.entityId, type: h.type, name: h.name, status: h.status, categoryId: h.categoryId };
    }

    return {
      tasks:    hits.filter(h => h.type === 'task').slice(0, 5).map(toHit),
      projects: hits.filter(h => h.type === 'project').slice(0, 5).map(toHit),
      items:    hits.filter(h => h.type === 'item').slice(0, 5).map(toHit),
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/backend && npx vitest run src/infrastructure/queries/MeilisearchSearchQueryService.spec.ts
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/ports/ISearchQueryService.ts packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.ts packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.spec.ts
git commit -m "feat(search): add ISearchQueryService port and MeilisearchSearchQueryService adapter"
```

---

## Task 6: Search API Route

**Files:**
- Create: `packages/backend/src/api/routes/search.router.ts`
- Create: `packages/backend/src/api/routes/search.router.spec.ts`

**Interfaces:**
- Consumes: `ISearchQueryService` from Task 5, `asyncHandler` from `api/utils/async-handler`, `AppError` from `api/errors/app-error`
- Produces: `makeSearchRouter(queryService: ISearchQueryService): Router` — consumed by Task 7

- [ ] **Step 1: Write failing tests**

```ts
// packages/backend/src/api/routes/search.router.spec.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { makeSearchRouter } from './search.router';
import type { ISearchQueryService } from '../../application/ports/ISearchQueryService';

const mockSearch = vi.fn();
const queryService: ISearchQueryService = { search: mockSearch };

const app = express();
app.use(express.json());
app.use('/search', makeSearchRouter(queryService));
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  const message = (err as Error).message ?? 'Internal server error';
  res.status(status).json({ error: message });
});

describe('GET /search', () => {
  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/search');
    expect(res.status).toBe(400);
  });

  it('returns 400 when q is 1 character', async () => {
    const res = await request(app).get('/search?q=a');
    expect(res.status).toBe(400);
  });

  it('returns 200 with search results for valid q', async () => {
    mockSearch.mockResolvedValueOnce({ tasks: [], projects: [], items: [] });
    const res = await request(app).get('/search?q=fix');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [], projects: [], items: [] });
    expect(mockSearch).toHaveBeenCalledWith('fix');
  });
});
```

- [ ] **Step 2: Check supertest is available**

```bash
cd packages/backend && node -e "require('supertest')" 2>&1 || npm install --save-dev supertest @types/supertest
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/backend && npx vitest run src/api/routes/search.router.spec.ts
```

Expected: FAIL — `Cannot find module './search.router'`

- [ ] **Step 4: Implement search.router.ts**

```ts
// packages/backend/src/api/routes/search.router.ts
import { Router } from 'express';
import type { ISearchQueryService } from '../../application/ports/ISearchQueryService';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';

export function makeSearchRouter(queryService: ISearchQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const q = req.query.q as string | undefined;
    if (!q || q.trim().length < 2) throw new AppError('Query must be at least 2 characters', 400);
    res.json(await queryService.search(q.trim()));
  }));

  return router;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/backend && npx vitest run src/api/routes/search.router.spec.ts
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/api/routes/search.router.ts packages/backend/src/api/routes/search.router.spec.ts
git commit -m "feat(search): add GET /api/v1/search route"
```

---

## Task 7: Wire Backend

**Files:**
- Modify: `packages/backend/src/infrastructure/composition-root.ts`
- Modify: `packages/backend/src/index.ts`

**Interfaces:**
- Consumes: `MeilisearchSearchIndexer` (Task 2), `MeilisearchSearchQueryService` (Task 5), all three search projectors (Task 3), `bootstrapSearchIndex` (Task 4), `makeSearchRouter` (Task 6), `env` (Task 1)

- [ ] **Step 1: Update composition-root.ts**

Add these imports at the top (after existing imports):

```ts
import { MeilisearchSearchIndexer } from './search/MeilisearchSearchIndexer';
import { MeilisearchSearchQueryService } from './queries/MeilisearchSearchQueryService';
import { createTasksSearchProjector } from './projections/tasks-search.projector';
import { createItemsSearchProjector } from './projections/items-search.projector';
import { createProjectsSearchProjector } from './projections/projects-search.projector';
import type { ISearchQueryService } from '../application/ports/ISearchQueryService';
import { env } from '../config/env';
```

Add `searchQueryService: ISearchQueryService` to the `AppDependencies` interface:

```ts
export interface AppDependencies {
  eventStore: IEventStore;
  commandBus: ICommandBus;
  taskQueryService: ITaskQueryService;
  itemQueryService: IItemQueryService;
  categoryQueryService: ICategoryQueryService;
  projectQueryService: IProjectQueryService;
  resourceQueryService: IResourceQueryService;
  balanceQueryService: IBalanceQueryService;
  dashboardQueryService: IDashboardQueryService;
  suggestQueryService: ISuggestQueryService;
  searchQueryService: ISearchQueryService;
  searchIndexer: MeilisearchSearchIndexer;
}
```

In `buildDependencies`, add before `createProjectorRunner`:

```ts
const searchIndexer = new MeilisearchSearchIndexer(env.MEILISEARCH_URL, env.MEILISEARCH_API_KEY);
```

Add to the `createProjectorRunner([...])` array (after the existing projectors):

```ts
createTasksSearchProjector(searchIndexer),
createItemsSearchProjector(searchIndexer),
createProjectsSearchProjector(searchIndexer),
```

Add to the returned object:

```ts
searchQueryService: new MeilisearchSearchQueryService(env.MEILISEARCH_URL, env.MEILISEARCH_API_KEY),
searchIndexer,
```

- [ ] **Step 2: Update index.ts**

Add these imports at the top:

```ts
import { makeSearchRouter } from './api/routes/search.router';
import { bootstrapSearchIndex } from './infrastructure/search/bootstrapSearchIndex';
```

Add the route registration after the existing versioned routes:

```ts
app.use('/api/v1/search', makeSearchRouter(deps.searchQueryService));
```

Add the bootstrap call after `await seed(...)`:

```ts
logger.info('Bootstrapping search index…');
await bootstrapSearchIndex(deps.searchIndexer, pool);
```

- [ ] **Step 3: Start the backend and verify no startup errors**

```bash
docker-compose up -d
cd packages/backend && npm run dev
```

Expected: logs show `Bootstrapping search index…` with no errors, server starts on port 3001.

- [ ] **Step 4: Smoke-test the search route**

```bash
curl "http://localhost:3001/api/v1/search?q=task"
```

Expected: `{ "tasks": [...], "projects": [...], "items": [...] }` (may be empty if no data seeded)

- [ ] **Step 5: Run full backend test suite**

```bash
cd packages/backend && npm test
```

Expected: all existing tests pass, new search tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/infrastructure/composition-root.ts packages/backend/src/index.ts
git commit -m "feat(search): wire Meilisearch indexer, projectors, and search route into composition root"
```

---

## Task 8: Frontend — useSearch Hook + TopBar Component

**Files:**
- Modify: `packages/frontend/src/api/queries.ts`
- Create: `packages/frontend/src/components/layout/TopBar.tsx`

**Interfaces:**
- Consumes: `fetchJSON` from `api/client.ts` (base `/api`, Vite proxy rewrites `/api/search` → `/api/v1/search`)
- Produces:
  - `SearchHit`, `SearchResults`, `useSearch(q: string)` hook — consumed within TopBar
  - `TopBar` component — consumed by Task 9

- [ ] **Step 1: Add SearchHit, SearchResults, and useSearch to queries.ts**

Append to `packages/frontend/src/api/queries.ts`:

```ts
export interface SearchHit {
  entityId: string;
  type: 'task' | 'project' | 'item';
  name: string;
  status: string | null;
  categoryId: string | null;
}

export interface SearchResults {
  tasks: SearchHit[];
  projects: SearchHit[];
  items: SearchHit[];
}

export const useSearch = (q: string) => useQuery({
  queryKey: ['search', q],
  queryFn: () => fetchJSON<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  enabled: q.length >= 2,
  staleTime: 10_000,
});
```

- [ ] **Step 2: Implement TopBar.tsx**

```tsx
// packages/frontend/src/components/layout/TopBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../api/queries';

const STATUS_LABEL: Record<string, string> = {
  ready: 'Ready', ongoing: 'Ongoing', pending: 'Pending', planned: 'Planned', done: 'Done',
  to_buy: 'To Buy', available: 'Available', consumed: 'Consumed',
  draft: 'Draft', active: 'Active', on_hold: 'On Hold',
};

export function TopBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setOpen(debouncedQuery.length >= 2);
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data, isFetching } = useSearch(debouncedQuery);

  const handleSelect = (type: 'task' | 'project' | 'item', entityId: string) => {
    if (type === 'task') navigate(`/tasks/${entityId}`);
    else if (type === 'project') navigate('/tasks');
    else navigate('/items');
    setQuery('');
    setOpen(false);
  };

  const hasResults = data && (data.tasks.length > 0 || data.projects.length > 0 || data.items.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="⌘  Search tasks, projects, items..."
        className="w-full px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm placeholder-gray-500 outline-none border border-gray-700 focus:border-indigo-500 transition-colors"
      />
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          {isFetching && !data && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          )}
          {!isFetching && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500">No results for &quot;{debouncedQuery}&quot;</div>
          )}
          {data && data.tasks.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</div>
              {data.tasks.map(hit => (
                <button key={hit.entityId} type="button"
                  onClick={() => handleSelect('task', hit.entityId)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors text-left">
                  <span>☐ {hit.name}</span>
                  {hit.status && <span className="text-xs text-gray-500 shrink-0 ml-2">{STATUS_LABEL[hit.status] ?? hit.status}</span>}
                </button>
              ))}
            </div>
          )}
          {data && data.projects.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</div>
              {data.projects.map(hit => (
                <button key={hit.entityId} type="button"
                  onClick={() => handleSelect('project', hit.entityId)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors text-left">
                  <span>📁 {hit.name}</span>
                  {hit.status && <span className="text-xs text-gray-500 shrink-0 ml-2">{STATUS_LABEL[hit.status] ?? hit.status}</span>}
                </button>
              ))}
            </div>
          )}
          {data && data.items.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</div>
              {data.items.map(hit => (
                <button key={hit.entityId} type="button"
                  onClick={() => handleSelect('item', hit.entityId)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors text-left">
                  <span>📦 {hit.name}</span>
                  {hit.status && <span className="text-xs text-gray-500 shrink-0 ml-2">{STATUS_LABEL[hit.status] ?? hit.status}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/api/queries.ts packages/frontend/src/components/layout/TopBar.tsx
git commit -m "feat(search): add useSearch hook and TopBar component with live dropdown"
```

---

## Task 9: App Layout Update + Dashboard Cleanup

**Files:**
- Modify: `packages/frontend/src/App.tsx`
- Modify: `packages/frontend/src/pages/Dashboard.tsx`
- Delete: `packages/frontend/src/components/layout/CommandBar.tsx`

**Interfaces:**
- Consumes: `TopBar` from Task 8

- [ ] **Step 1: Update App.tsx**

Replace the entire file:

```tsx
// packages/frontend/src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { TaskDetail } from './pages/TaskDetail';
import { NewTask } from './pages/NewTask';
import { Items } from './pages/Items';
import { Calendar } from './pages/Calendar';
import { Suggest } from './pages/Suggest';
import { Resources } from './pages/Resources';
import { BalanceRules } from './pages/BalanceRules';
import { Categories } from './pages/Categories';

export function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
        <TopBar />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<NewTask />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/items" element={<Items />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/suggest" element={<Suggest />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/balance" element={<BalanceRules />} />
            <Route path="/categories" element={<Categories />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update Dashboard.tsx — remove CommandBar import and usage**

Remove this import line:

```ts
import { CommandBar } from '../components/layout/CommandBar';
```

Remove the `<CommandBar />` JSX line (it is at line 100 inside the left column `<div>`).

- [ ] **Step 3: Delete CommandBar.tsx**

```bash
rm packages/frontend/src/components/layout/CommandBar.tsx
```

- [ ] **Step 4: Verify the frontend builds with no type errors**

```bash
cd packages/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start the frontend dev server and manually verify**

```bash
npm run dev:frontend
```

Open `http://localhost:5173` and verify:
- A top bar is visible on every page with a search input
- Typing 2+ characters shows a dropdown with grouped results
- Clicking a task result navigates to `/tasks/:id`
- Pressing Escape dismisses the dropdown
- Cmd+K / Ctrl+K focuses the search input from any page
- Dashboard no longer has the old CommandBar button

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/App.tsx packages/frontend/src/pages/Dashboard.tsx
git rm packages/frontend/src/components/layout/CommandBar.tsx
git commit -m "feat(search): add global TopBar layout, remove Dashboard CommandBar modal"
```

---

## Completion Checklist

- [ ] `docker-compose up -d` starts both `postgres` and `meilisearch` without errors
- [ ] `npm run dev:backend` logs `Bootstrapping search index…` and starts cleanly
- [ ] `npm test` passes all tests across all workspaces
- [ ] `GET /api/v1/search?q=fix` returns `{ tasks, projects, items }` shape
- [ ] `GET /api/v1/search?q=a` returns 400
- [ ] Frontend: typing in the top bar shows live results from all three types
- [ ] Frontend: click navigates to the correct destination and closes the dropdown
- [ ] Frontend: Escape and click-outside dismiss the dropdown
- [ ] Frontend: Cmd+K focuses the search input
- [ ] Dashboard: no CommandBar modal or button remains
