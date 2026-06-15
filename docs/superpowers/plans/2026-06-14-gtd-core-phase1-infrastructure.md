# GTD Core — Phase 1: Infrastructure & Domain

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monorepo scaffold, Docker PostgreSQL, event store, all 6 domain aggregates with tests, and the command bus.

**Architecture:** npm workspaces monorepo with `packages/backend`, `packages/frontend`, `packages/mcp`. Domain aggregates are pure functions — they receive a command + current state, return new events. The EventStore persists events to PostgreSQL with optimistic concurrency. The CommandBus wires commands to aggregates and persists their events.

**Tech Stack:** Node.js 20 · TypeScript 5 · PostgreSQL 16 · pg · uuid · vitest · Express (shell only in this phase)

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `docker-compose.yml`
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Create workspace root `package.json`**

```json
{
  "name": "personal-care",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:backend": "npm run dev --workspace=packages/backend",
    "dev:frontend": "npm run dev --workspace=packages/frontend",
    "test": "npm run test --workspaces"
  }
}
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
version: '3.8'
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
volumes:
  postgres_data:
```

- [ ] **Step 3: Create `packages/backend/package.json`**

```json
{
  "name": "@personal-care/backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node --esm src/index.ts",
    "test": "vitest run",
    "migrate": "ts-node --esm src/db/migrate.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "pg": "^8.11.3",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/pg": "^8.10.9",
    "@types/uuid": "^9.0.7",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 4: Create `packages/backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create `packages/frontend/package.json`**

```json
{
  "name": "@personal-care/frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@fullcalendar/core": "^6.1.10",
    "@fullcalendar/daygrid": "^6.1.10",
    "@fullcalendar/interaction": "^6.1.10",
    "@fullcalendar/react": "^6.1.10",
    "@fullcalendar/timegrid": "^6.1.10",
    "@tanstack/react-query": "^5.17.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 6: Create `packages/frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Create `packages/mcp/package.json`**

```json
{
  "name": "@personal-care/mcp",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node --esm src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "pg": "^8.11.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/pg": "^8.10.9",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2"
  }
}
```

- [ ] **Step 8: Create `packages/mcp/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 9: Create `.gitignore`**

```
node_modules/
dist/
.env
*.env
```

- [ ] **Step 10: Create `.env` in `packages/backend/`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_care
PORT=3001
```

- [ ] **Step 11: Install dependencies and start PostgreSQL**

```bash
npm install
docker-compose up -d
```

Expected: `postgres` container running on port 5432.

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "chore: monorepo scaffold with backend, frontend, mcp packages"
```

---

### Task 2: Shared domain types

**Files:**
- Create: `packages/backend/src/types.ts`

- [ ] **Step 1: Write `packages/backend/src/types.ts`**

```typescript
export type UUID = string;

// Domain value types
export type TaskStatus = 'ready' | 'ongoing' | 'pending' | 'planned' | 'done';
export type ItemStatus = 'to_buy' | 'available' | 'consumed';
export type ProjectStatus = 'active' | 'on_hold' | 'done';
export type ResourceType = 'link' | 'note' | 'video' | 'file' | 'doc';
export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year';
export type DurationUnit = 'hour' | 'day';
export type BalanceFrequency = 'daily' | 'weekly' | 'monthly';
export type DayRestriction = 'weekend' | 'weekday' | null;

export interface RecurrenceRule {
  interval: number;
  unit: RecurrenceUnit;
}

export interface EstimatedDuration {
  value: number;
  unit: DurationUnit;
}

// Event store types
export interface StoredEvent {
  id: number;
  aggregateId: UUID;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  version: number;
  createdAt: Date;
}

export interface DomainEvent {
  aggregateId: UUID;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/types.ts
git commit -m "feat: shared domain types"
```

---

### Task 3: PostgreSQL event store

**Files:**
- Create: `packages/backend/src/db/client.ts`
- Create: `packages/backend/src/db/migrate.ts`
- Create: `packages/backend/src/event-store/event-store.ts`
- Create: `packages/backend/tests/event-store/event-store.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/backend/tests/event-store/event-store.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EventStore } from '../../src/event-store/event-store';
import { Pool } from 'pg';

let pool: Pool;
let store: EventStore;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  store = new EventStore(pool);
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
  await pool.query('TRUNCATE events RESTART IDENTITY');
});

afterAll(async () => { await pool.end(); });

describe('EventStore', () => {
  it('appends events and retrieves them', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    await store.append([
      { aggregateId: id, aggregateType: 'category', eventType: 'CategoryCreated', payload: { name: 'Home' } },
    ], 0);
    const events = await store.getEvents(id);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryCreated');
    expect(events[0].version).toBe(1);
  });

  it('throws on optimistic concurrency conflict', async () => {
    const id = '22222222-2222-2222-2222-222222222222';
    await store.append([
      { aggregateId: id, aggregateType: 'category', eventType: 'CategoryCreated', payload: { name: 'X' } },
    ], 0);
    await expect(
      store.append([
        { aggregateId: id, aggregateType: 'category', eventType: 'CategoryUpdated', payload: { name: 'Y' } },
      ], 0)
    ).rejects.toThrow('Concurrency conflict');
  });

  it('getAllEventsSince returns events after a given id', async () => {
    const all = await store.getAllEventsSince(0);
    expect(all.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx vitest run tests/event-store/event-store.test.ts
```

Expected: FAIL — `EventStore` not defined.

- [ ] **Step 3: Write `packages/backend/src/db/client.ts`**

```typescript
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  }
  return pool;
}
```

- [ ] **Step 4: Write `packages/backend/src/event-store/event-store.ts`**

```typescript
import { Pool } from 'pg';
import { DomainEvent, StoredEvent } from '../types';

export class EventStore {
  constructor(private pool: Pool) {}

  async append(events: DomainEvent[], expectedVersion: number): Promise<StoredEvent[]> {
    if (events.length === 0) return [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const stored: StoredEvent[] = [];
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        const version = expectedVersion + i + 1;
        try {
          const result = await client.query<StoredEvent>(
            `INSERT INTO events (aggregate_id, aggregate_type, event_type, payload, version)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
                       event_type as "eventType", payload, version, created_at as "createdAt"`,
            [e.aggregateId, e.aggregateType, e.eventType, JSON.stringify(e.payload), version]
          );
          stored.push(result.rows[0]);
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('unique')) {
            throw new Error(`Concurrency conflict on aggregate ${e.aggregateId} at version ${version}`);
          }
          throw err;
        }
      }
      await client.query('COMMIT');
      return stored;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE aggregate_id = $1 ORDER BY version ASC`,
      [aggregateId]
    );
    return result.rows;
  }

  async getAllEventsSince(afterId: number): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE id > $1 ORDER BY id ASC`,
      [afterId]
    );
    return result.rows;
  }
}
```

- [ ] **Step 5: Write `packages/backend/src/db/migrate.ts`**

```typescript
import { getPool } from './client';

async function migrate() {
  const pool = getPool();
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
  console.log('Event store migration complete');
  await pool.end();
}

migrate().catch(console.error);
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd packages/backend && npx vitest run tests/event-store/event-store.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/ packages/backend/tests/
git commit -m "feat: PostgreSQL event store with optimistic concurrency"
```

---

### Task 4: Category domain aggregate

**Files:**
- Create: `packages/backend/src/domain/category/types.ts`
- Create: `packages/backend/src/domain/category/aggregate.ts`
- Create: `packages/backend/tests/domain/category.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/backend/tests/domain/category.test.ts
import { describe, it, expect } from 'vitest';
import { handleCategoryCommand } from '../../src/domain/category/aggregate';

describe('Category aggregate', () => {
  it('CreateCategory emits CategoryCreated', () => {
    const events = handleCategoryCommand(
      { type: 'CreateCategory', payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false } },
      []
    );
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryCreated');
    expect(events[0].payload.name).toBe('Home');
  });

  it('UpdateCategory emits CategoryUpdated', () => {
    const existing = [{ eventType: 'CategoryCreated', payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false } }];
    const events = handleCategoryCommand(
      { type: 'UpdateCategory', payload: { id: 'cat-1', name: 'House', icon: '🏡', color: '#22c55e' } },
      existing
    );
    expect(events[0].eventType).toBe('CategoryUpdated');
  });

  it('DeleteCategory rejects built-in categories', () => {
    const existing = [{ eventType: 'CategoryCreated', payload: { id: 'cat-1', name: 'Health', icon: '💪', color: '#ef4444', isDefault: true } }];
    expect(() =>
      handleCategoryCommand({ type: 'DeleteCategory', payload: { id: 'cat-1' } }, existing)
    ).toThrow('Cannot delete built-in category');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx vitest run tests/domain/category.test.ts
```

Expected: FAIL — `handleCategoryCommand` not defined.

- [ ] **Step 3: Write `packages/backend/src/domain/category/types.ts`**

```typescript
import { UUID } from '../../types';

export interface CreateCategoryPayload { id: UUID; name: string; icon: string; color: string; isDefault: boolean; }
export interface UpdateCategoryPayload { id: UUID; name?: string; icon?: string; color?: string; }
export interface DeleteCategoryPayload { id: UUID; }

export type CategoryCommand =
  | { type: 'CreateCategory'; payload: CreateCategoryPayload }
  | { type: 'UpdateCategory'; payload: UpdateCategoryPayload }
  | { type: 'DeleteCategory'; payload: DeleteCategoryPayload };

export interface CategoryState {
  id: UUID;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  deleted: boolean;
}
```

- [ ] **Step 4: Write `packages/backend/src/domain/category/aggregate.ts`**

```typescript
import { DomainEvent } from '../../types';
import { CategoryCommand, CategoryState } from './types';

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): CategoryState | null {
  let state: CategoryState | null = null;
  for (const e of events) {
    if (e.eventType === 'CategoryCreated') {
      state = { ...(e.payload as CategoryState), deleted: false };
    } else if (e.eventType === 'CategoryUpdated' && state) {
      Object.assign(state, e.payload);
    } else if (e.eventType === 'CategoryDeleted' && state) {
      state.deleted = true;
    }
  }
  return state;
}

export function handleCategoryCommand(
  command: CategoryCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'category';

  switch (command.type) {
    case 'CreateCategory':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryCreated', payload: command.payload }];

    case 'UpdateCategory': {
      if (!state || state.deleted) throw new Error('Category not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryUpdated', payload: command.payload }];
    }

    case 'DeleteCategory': {
      if (!state || state.deleted) throw new Error('Category not found');
      if (state.isDefault) throw new Error('Cannot delete built-in category');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'CategoryDeleted', payload: command.payload }];
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/backend && npx vitest run tests/domain/category.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/domain/category/ packages/backend/tests/domain/category.test.ts
git commit -m "feat: Category domain aggregate"
```

---

### Task 5: Item domain aggregate

**Files:**
- Create: `packages/backend/src/domain/item/types.ts`
- Create: `packages/backend/src/domain/item/aggregate.ts`
- Create: `packages/backend/tests/domain/item.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/backend/tests/domain/item.test.ts
import { describe, it, expect } from 'vitest';
import { handleItemCommand } from '../../src/domain/item/aggregate';

const created = [{ eventType: 'ItemCreated', payload: { id: 'item-1', name: 'Solar light', categoryId: 'cat-1', status: 'to_buy' } }];

describe('Item aggregate', () => {
  it('CreateItem emits ItemCreated with status to_buy', () => {
    const events = handleItemCommand(
      { type: 'CreateItem', payload: { id: 'item-1', name: 'Solar light', categoryId: 'cat-1' } },
      []
    );
    expect(events[0].eventType).toBe('ItemCreated');
    expect(events[0].payload.status).toBe('to_buy');
  });

  it('MarkItemAvailable emits ItemMarkedAvailable', () => {
    const events = handleItemCommand({ type: 'MarkItemAvailable', payload: { id: 'item-1' } }, created);
    expect(events[0].eventType).toBe('ItemMarkedAvailable');
  });

  it('MarkItemConsumed emits ItemMarkedConsumed', () => {
    const available = [...created, { eventType: 'ItemMarkedAvailable', payload: { id: 'item-1' } }];
    const events = handleItemCommand({ type: 'MarkItemConsumed', payload: { id: 'item-1' } }, available);
    expect(events[0].eventType).toBe('ItemMarkedConsumed');
  });

  it('MarkItemAvailableAgain from consumed emits ItemMarkedAvailableAgain', () => {
    const consumed = [...created,
      { eventType: 'ItemMarkedAvailable', payload: { id: 'item-1' } },
      { eventType: 'ItemMarkedConsumed', payload: { id: 'item-1' } }
    ];
    const events = handleItemCommand({ type: 'MarkItemAvailableAgain', payload: { id: 'item-1' } }, consumed);
    expect(events[0].eventType).toBe('ItemMarkedAvailableAgain');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx vitest run tests/domain/item.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write `packages/backend/src/domain/item/types.ts`**

```typescript
import { UUID, ItemStatus } from '../../types';

export interface CreateItemPayload { id: UUID; name: string; categoryId: UUID; description?: string; quantity?: number; price?: number; notes?: string; }
export interface MarkItemPayload { id: UUID; }

export type ItemCommand =
  | { type: 'CreateItem'; payload: CreateItemPayload }
  | { type: 'MarkItemAvailable'; payload: MarkItemPayload }
  | { type: 'MarkItemConsumed'; payload: MarkItemPayload }
  | { type: 'MarkItemAvailableAgain'; payload: MarkItemPayload };

export interface ItemState { id: UUID; name: string; categoryId: UUID; status: ItemStatus; }
```

- [ ] **Step 4: Write `packages/backend/src/domain/item/aggregate.ts`**

```typescript
import { DomainEvent } from '../../types';
import { ItemCommand, ItemState } from './types';

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): ItemState | null {
  let state: ItemState | null = null;
  for (const e of events) {
    if (e.eventType === 'ItemCreated') state = { ...(e.payload as ItemState) };
    else if (state) {
      if (e.eventType === 'ItemMarkedAvailable' || e.eventType === 'ItemMarkedAvailableAgain') state.status = 'available';
      else if (e.eventType === 'ItemMarkedConsumed') state.status = 'consumed';
    }
  }
  return state;
}

export function handleItemCommand(
  command: ItemCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'item';

  switch (command.type) {
    case 'CreateItem':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemCreated', payload: { ...command.payload, status: 'to_buy' } }];
    case 'MarkItemAvailable': {
      if (!state) throw new Error('Item not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedAvailable', payload: command.payload }];
    }
    case 'MarkItemConsumed': {
      if (!state || state.status !== 'available') throw new Error('Item must be available to consume');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedConsumed', payload: command.payload }];
    }
    case 'MarkItemAvailableAgain': {
      if (!state) throw new Error('Item not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ItemMarkedAvailableAgain', payload: command.payload }];
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/backend && npx vitest run tests/domain/item.test.ts
```

Expected: PASS — 4 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/domain/item/ packages/backend/tests/domain/item.test.ts
git commit -m "feat: Item domain aggregate"
```

---

### Task 6: Task domain aggregate (with recurrence)

**Files:**
- Create: `packages/backend/src/domain/task/types.ts`
- Create: `packages/backend/src/domain/task/aggregate.ts`
- Create: `packages/backend/tests/domain/task.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/backend/tests/domain/task.test.ts
import { describe, it, expect } from 'vitest';
import { handleTaskCommand } from '../../src/domain/task/aggregate';

const baseHistory = [{ eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } }];

describe('Task aggregate', () => {
  it('CreateTask emits TaskCreated', () => {
    const events = handleTaskCommand(
      { type: 'CreateTask', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } },
      []
    );
    expect(events[0].eventType).toBe('TaskCreated');
  });

  it('StartTask emits TaskStarted', () => {
    const events = handleTaskCommand({ type: 'StartTask', payload: { id: 'task-1' } }, baseHistory);
    expect(events[0].eventType).toBe('TaskStarted');
  });

  it('CompleteTask on non-recurring emits only TaskCompleted', () => {
    const events = handleTaskCommand({ type: 'CompleteTask', payload: { id: 'task-1', itemDisposals: [] } }, baseHistory);
    expect(events.map(e => e.eventType)).toEqual(['TaskCompleted']);
  });

  it('CompleteTask on recurring emits TaskCompleted + TaskRescheduled', () => {
    const history = [
      { eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } },
      { eventType: 'TaskRecurrenceSet', payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'year' }, dueDate: '2026-06-14T00:00:00Z' } },
    ];
    const events = handleTaskCommand({ type: 'CompleteTask', payload: { id: 'task-1', itemDisposals: [] } }, history);
    expect(events.map(e => e.eventType)).toEqual(['TaskCompleted', 'TaskRescheduled']);
    const rescheduled = events[1].payload as { nextDueDate: string };
    expect(new Date(rescheduled.nextDueDate).getFullYear()).toBe(2027);
  });

  it('AddItemRequirement emits ItemRequirementAdded', () => {
    const events = handleTaskCommand(
      { type: 'AddItemRequirement', payload: { taskId: 'task-1', itemId: 'item-1', consumable: true } },
      baseHistory
    );
    expect(events[0].eventType).toBe('ItemRequirementAdded');
  });

  it('PromoteToProject emits TaskPromotedToProject', () => {
    const events = handleTaskCommand(
      { type: 'PromoteToProject', payload: { taskId: 'task-1', projectId: 'proj-1' } },
      baseHistory
    );
    expect(events[0].eventType).toBe('TaskPromotedToProject');
  });

  it('ScheduleTask emits TaskScheduled', () => {
    const events = handleTaskCommand(
      { type: 'ScheduleTask', payload: { id: 'task-1', scheduledDate: '2026-06-15', scheduledStartTime: '09:00' } },
      baseHistory
    );
    expect(events[0].eventType).toBe('TaskScheduled');
  });

  it('SetTaskRecurrence emits TaskRecurrenceSet', () => {
    const events = handleTaskCommand(
      { type: 'SetTaskRecurrence', payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'month' } } },
      baseHistory
    );
    expect(events[0].eventType).toBe('TaskRecurrenceSet');
  });

  it('SkipRecurrence emits RecurrenceSkipped with next due date', () => {
    const history = [
      { eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } },
      { eventType: 'TaskRecurrenceSet', payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'year' }, dueDate: '2026-06-14T00:00:00Z' } },
    ];
    const events = handleTaskCommand({ type: 'SkipRecurrence', payload: { id: 'task-1' } }, history);
    expect(events[0].eventType).toBe('RecurrenceSkipped');
    const payload = events[0].payload as { nextDueDate: string };
    expect(new Date(payload.nextDueDate).getFullYear()).toBe(2027);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx vitest run tests/domain/task.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write `packages/backend/src/domain/task/types.ts`**

```typescript
import { UUID, RecurrenceRule, EstimatedDuration } from '../../types';

export interface CreateTaskPayload { id: UUID; name: string; categoryId: UUID; description?: string; projectId?: UUID; estimatedDuration?: EstimatedDuration; dueDate?: string; }
export interface StartTaskPayload { id: UUID; }
export interface CompleteTaskPayload { id: UUID; itemDisposals: Array<{ itemId: UUID; consumed: boolean }>; }
export interface AddItemRequirementPayload { taskId: UUID; itemId: UUID; consumable: boolean; }
export interface AttachResourcePayload { taskId: UUID; resourceId: UUID; }
export interface DetachResourcePayload { taskId: UUID; resourceId: UUID; }
export interface SetTaskRecurrencePayload { id: UUID; recurrenceRule: RecurrenceRule; dueDate?: string; }
export interface SkipRecurrencePayload { id: UUID; }
export interface ScheduleTaskPayload { id: UUID; scheduledDate: string; scheduledStartTime: string; }
export interface PromoteToProjectPayload { taskId: UUID; projectId: UUID; }

export type TaskCommand =
  | { type: 'CreateTask'; payload: CreateTaskPayload }
  | { type: 'StartTask'; payload: StartTaskPayload }
  | { type: 'CompleteTask'; payload: CompleteTaskPayload }
  | { type: 'AddItemRequirement'; payload: AddItemRequirementPayload }
  | { type: 'AttachResourceToTask'; payload: AttachResourcePayload }
  | { type: 'DetachResourceFromTask'; payload: DetachResourcePayload }
  | { type: 'SetTaskRecurrence'; payload: SetTaskRecurrencePayload }
  | { type: 'SkipRecurrence'; payload: SkipRecurrencePayload }
  | { type: 'ScheduleTask'; payload: ScheduleTaskPayload }
  | { type: 'PromoteToProject'; payload: PromoteToProjectPayload };

export interface TaskState {
  id: UUID;
  name: string;
  categoryId: UUID;
  started: boolean;
  completed: boolean;
  recurrenceRule: RecurrenceRule | null;
  dueDate: string | null;
}
```

- [ ] **Step 4: Write `packages/backend/src/domain/task/aggregate.ts`**

```typescript
import { DomainEvent, RecurrenceRule } from '../../types';
import { TaskCommand, TaskState } from './types';

function addInterval(date: Date, rule: RecurrenceRule): Date {
  const d = new Date(date);
  if (rule.unit === 'day') d.setDate(d.getDate() + rule.interval);
  else if (rule.unit === 'week') d.setDate(d.getDate() + rule.interval * 7);
  else if (rule.unit === 'month') d.setMonth(d.getMonth() + rule.interval);
  else if (rule.unit === 'year') d.setFullYear(d.getFullYear() + rule.interval);
  return d;
}

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): TaskState | null {
  let state: TaskState | null = null;
  for (const e of events) {
    const p = e.payload as Record<string, unknown>;
    if (e.eventType === 'TaskCreated') {
      state = { id: p.id as string, name: p.name as string, categoryId: p.categoryId as string, started: false, completed: false, recurrenceRule: null, dueDate: (p.dueDate as string) ?? null };
    } else if (state) {
      if (e.eventType === 'TaskStarted') state.started = true;
      else if (e.eventType === 'TaskCompleted') state.completed = true;
      else if (e.eventType === 'TaskRescheduled') { state.completed = false; state.started = false; state.dueDate = p.nextDueDate as string; }
      else if (e.eventType === 'TaskRecurrenceSet') { state.recurrenceRule = p.recurrenceRule as RecurrenceRule; if (p.dueDate) state.dueDate = p.dueDate as string; }
      else if (e.eventType === 'RecurrenceSkipped') state.dueDate = p.nextDueDate as string;
    }
  }
  return state;
}

export function handleTaskCommand(
  command: TaskCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'task';

  switch (command.type) {
    case 'CreateTask':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskCreated', payload: command.payload }];

    case 'StartTask': {
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskStarted', payload: command.payload }];
    }

    case 'CompleteTask': {
      if (!state) throw new Error('Task not found');
      const events: Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] = [
        { aggregateId: command.payload.id, aggregateType, eventType: 'TaskCompleted', payload: command.payload },
      ];
      if (state.recurrenceRule) {
        const base = state.dueDate ? new Date(state.dueDate) : new Date();
        const nextDueDate = addInterval(base, state.recurrenceRule).toISOString();
        events.push({ aggregateId: command.payload.id, aggregateType, eventType: 'TaskRescheduled', payload: { id: command.payload.id, nextDueDate } });
      }
      return events;
    }

    case 'AddItemRequirement':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'ItemRequirementAdded', payload: command.payload }];

    case 'AttachResourceToTask':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'ResourceAttachedToTask', payload: command.payload }];

    case 'DetachResourceFromTask':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'ResourceDetachedFromTask', payload: command.payload }];

    case 'SetTaskRecurrence':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskRecurrenceSet', payload: command.payload }];

    case 'SkipRecurrence': {
      if (!state || !state.recurrenceRule) throw new Error('Task has no recurrence rule');
      const base = state.dueDate ? new Date(state.dueDate) : new Date();
      const nextDueDate = addInterval(base, state.recurrenceRule).toISOString();
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'RecurrenceSkipped', payload: { id: command.payload.id, nextDueDate } }];
    }

    case 'ScheduleTask':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskScheduled', payload: command.payload }];

    case 'PromoteToProject':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'TaskPromotedToProject', payload: command.payload }];
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd packages/backend && npx vitest run tests/domain/task.test.ts
```

Expected: PASS — 9 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/domain/task/ packages/backend/tests/domain/task.test.ts
git commit -m "feat: Task domain aggregate with recurrence"
```

---

### Task 7: Project, Resource, BalanceRule domain aggregates

**Files:**
- Create: `packages/backend/src/domain/project/types.ts`
- Create: `packages/backend/src/domain/project/aggregate.ts`
- Create: `packages/backend/src/domain/resource/types.ts`
- Create: `packages/backend/src/domain/resource/aggregate.ts`
- Create: `packages/backend/src/domain/balance-rule/types.ts`
- Create: `packages/backend/src/domain/balance-rule/aggregate.ts`
- Create: `packages/backend/tests/domain/project.test.ts`
- Create: `packages/backend/tests/domain/resource.test.ts`
- Create: `packages/backend/tests/domain/balance-rule.test.ts`

- [ ] **Step 1: Write `packages/backend/src/domain/project/types.ts`**

```typescript
import { UUID } from '../../types';

export interface CreateProjectPayload { id: UUID; name: string; categoryId: UUID; description?: string; dueDate?: string; }
export interface AddTaskToProjectPayload { projectId: UUID; taskId: UUID; }
export interface CompleteProjectPayload { id: UUID; }

export type ProjectCommand =
  | { type: 'CreateProject'; payload: CreateProjectPayload }
  | { type: 'AddTaskToProject'; payload: AddTaskToProjectPayload }
  | { type: 'CompleteProject'; payload: CompleteProjectPayload };

export interface ProjectState { id: UUID; name: string; status: 'active' | 'on_hold' | 'done'; taskIds: UUID[]; }
```

- [ ] **Step 2: Write `packages/backend/src/domain/project/aggregate.ts`**

```typescript
import { DomainEvent } from '../../types';
import { ProjectCommand, ProjectState } from './types';

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): ProjectState | null {
  let state: ProjectState | null = null;
  for (const e of events) {
    const p = e.payload as Record<string, unknown>;
    if (e.eventType === 'ProjectCreated') state = { id: p.id as string, name: p.name as string, status: 'active', taskIds: [] };
    else if (state) {
      if (e.eventType === 'TaskAddedToProject') state.taskIds.push(p.taskId as string);
      else if (e.eventType === 'ProjectCompleted') state.status = 'done';
    }
  }
  return state;
}

export function handleProjectCommand(
  command: ProjectCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'project';

  switch (command.type) {
    case 'CreateProject':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ProjectCreated', payload: command.payload }];
    case 'AddTaskToProject':
      if (!state) throw new Error('Project not found');
      return [{ aggregateId: command.payload.projectId, aggregateType, eventType: 'TaskAddedToProject', payload: command.payload }];
    case 'CompleteProject':
      if (!state) throw new Error('Project not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ProjectCompleted', payload: command.payload }];
  }
}
```

- [ ] **Step 3: Write `packages/backend/src/domain/resource/types.ts`**

```typescript
import { UUID, ResourceType } from '../../types';

export interface CreateResourcePayload { id: UUID; title: string; type: ResourceType; url?: string; notes?: string; categoryId?: UUID; }
export interface UpdateResourcePayload { id: UUID; title?: string; url?: string; notes?: string; }
export interface DeleteResourcePayload { id: UUID; }

export type ResourceCommand =
  | { type: 'CreateResource'; payload: CreateResourcePayload }
  | { type: 'UpdateResource'; payload: UpdateResourcePayload }
  | { type: 'DeleteResource'; payload: DeleteResourcePayload };
```

- [ ] **Step 4: Write `packages/backend/src/domain/resource/aggregate.ts`**

```typescript
import { DomainEvent } from '../../types';
import { ResourceCommand } from './types';

export function handleResourceCommand(
  command: ResourceCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const aggregateType = 'resource';
  const exists = history.some(e => e.eventType === 'ResourceCreated');

  switch (command.type) {
    case 'CreateResource':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ResourceCreated', payload: command.payload }];
    case 'UpdateResource':
      if (!exists) throw new Error('Resource not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ResourceUpdated', payload: command.payload }];
    case 'DeleteResource':
      if (!exists) throw new Error('Resource not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'ResourceDeleted', payload: command.payload }];
  }
}
```

- [ ] **Step 5: Write `packages/backend/src/domain/balance-rule/types.ts`**

```typescript
import { UUID, BalanceFrequency, DayRestriction } from '../../types';

export interface CreateBalanceRulePayload { id: UUID; categoryId: UUID; minimumCount: number; frequency: BalanceFrequency; dayRestriction: DayRestriction; }
export interface UpdateBalanceRulePayload { id: UUID; minimumCount?: number; frequency?: BalanceFrequency; dayRestriction?: DayRestriction; }
export interface DeleteBalanceRulePayload { id: UUID; }

export type BalanceRuleCommand =
  | { type: 'CreateBalanceRule'; payload: CreateBalanceRulePayload }
  | { type: 'UpdateBalanceRule'; payload: UpdateBalanceRulePayload }
  | { type: 'DeleteBalanceRule'; payload: DeleteBalanceRulePayload };
```

- [ ] **Step 6: Write `packages/backend/src/domain/balance-rule/aggregate.ts`**

```typescript
import { DomainEvent } from '../../types';
import { BalanceRuleCommand } from './types';

export function handleBalanceRuleCommand(
  command: BalanceRuleCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const aggregateType = 'balance_rule';
  const exists = history.some(e => e.eventType === 'BalanceRuleCreated');

  switch (command.type) {
    case 'CreateBalanceRule':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'BalanceRuleCreated', payload: command.payload }];
    case 'UpdateBalanceRule':
      if (!exists) throw new Error('BalanceRule not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'BalanceRuleUpdated', payload: command.payload }];
    case 'DeleteBalanceRule':
      if (!exists) throw new Error('BalanceRule not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'BalanceRuleDeleted', payload: command.payload }];
  }
}
```

- [ ] **Step 7: Write tests for project, resource, balance-rule**

```typescript
// packages/backend/tests/domain/project.test.ts
import { describe, it, expect } from 'vitest';
import { handleProjectCommand } from '../../src/domain/project/aggregate';

describe('Project aggregate', () => {
  it('CreateProject emits ProjectCreated', () => {
    const events = handleProjectCommand({ type: 'CreateProject', payload: { id: 'p-1', name: 'Home reno', categoryId: 'cat-1' } }, []);
    expect(events[0].eventType).toBe('ProjectCreated');
  });
  it('AddTaskToProject emits TaskAddedToProject', () => {
    const history = [{ eventType: 'ProjectCreated', payload: { id: 'p-1', name: 'Home reno', categoryId: 'cat-1' } }];
    const events = handleProjectCommand({ type: 'AddTaskToProject', payload: { projectId: 'p-1', taskId: 'task-1' } }, history);
    expect(events[0].eventType).toBe('TaskAddedToProject');
  });
  it('CompleteProject emits ProjectCompleted', () => {
    const history = [{ eventType: 'ProjectCreated', payload: { id: 'p-1', name: 'Home reno', categoryId: 'cat-1' } }];
    const events = handleProjectCommand({ type: 'CompleteProject', payload: { id: 'p-1' } }, history);
    expect(events[0].eventType).toBe('ProjectCompleted');
  });
});
```

```typescript
// packages/backend/tests/domain/resource.test.ts
import { describe, it, expect } from 'vitest';
import { handleResourceCommand } from '../../src/domain/resource/aggregate';

describe('Resource aggregate', () => {
  it('CreateResource emits ResourceCreated', () => {
    const events = handleResourceCommand({ type: 'CreateResource', payload: { id: 'r-1', title: 'GTD Book', type: 'link', url: 'https://example.com' } }, []);
    expect(events[0].eventType).toBe('ResourceCreated');
  });
  it('DeleteResource emits ResourceDeleted', () => {
    const history = [{ eventType: 'ResourceCreated', payload: { id: 'r-1', title: 'GTD Book', type: 'link' } }];
    const events = handleResourceCommand({ type: 'DeleteResource', payload: { id: 'r-1' } }, history);
    expect(events[0].eventType).toBe('ResourceDeleted');
  });
});
```

```typescript
// packages/backend/tests/domain/balance-rule.test.ts
import { describe, it, expect } from 'vitest';
import { handleBalanceRuleCommand } from '../../src/domain/balance-rule/aggregate';

describe('BalanceRule aggregate', () => {
  it('CreateBalanceRule emits BalanceRuleCreated', () => {
    const events = handleBalanceRuleCommand(
      { type: 'CreateBalanceRule', payload: { id: 'br-1', categoryId: 'cat-study', minimumCount: 1, frequency: 'daily', dayRestriction: null } },
      []
    );
    expect(events[0].eventType).toBe('BalanceRuleCreated');
  });
  it('DeleteBalanceRule emits BalanceRuleDeleted', () => {
    const history = [{ eventType: 'BalanceRuleCreated', payload: { id: 'br-1', categoryId: 'cat-study', minimumCount: 1, frequency: 'daily', dayRestriction: null } }];
    const events = handleBalanceRuleCommand({ type: 'DeleteBalanceRule', payload: { id: 'br-1' } }, history);
    expect(events[0].eventType).toBe('BalanceRuleDeleted');
  });
});
```

- [ ] **Step 8: Run all domain tests**

```bash
cd packages/backend && npx vitest run tests/domain/
```

Expected: PASS — all 9+ domain tests passing.

- [ ] **Step 9: Commit**

```bash
git add packages/backend/src/domain/ packages/backend/tests/domain/
git commit -m "feat: Project, Resource, BalanceRule domain aggregates"
```

---

### Task 8: Command Bus

**Files:**
- Create: `packages/backend/src/command-bus/command-bus.ts`
- Create: `packages/backend/tests/command-bus/command-bus.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/backend/tests/command-bus/command-bus.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { EventStore } from '../../src/event-store/event-store';
import { CommandBus } from '../../src/command-bus/command-bus';

let pool: Pool;
let bus: CommandBus;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  const store = new EventStore(pool);
  bus = new CommandBus(store);
  await pool.query('TRUNCATE events RESTART IDENTITY');
});

afterAll(async () => { await pool.end(); });

describe('CommandBus', () => {
  it('dispatches CreateCategory and returns stored events', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    const events = await bus.dispatch({ type: 'CreateCategory', payload: { id, name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false } });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryCreated');
    expect(events[0].id).toBeGreaterThan(0);
  });

  it('dispatches CreateTask and returns stored events', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const catId = uuidv4();
    await bus.dispatch({ type: 'CreateCategory', payload: { id: catId, name: 'Cars', icon: '🚗', color: '#3b82f6', isDefault: false } });
    const taskId = uuidv4();
    const events = await bus.dispatch({ type: 'CreateTask', payload: { id: taskId, name: 'Oil change', categoryId: catId } });
    expect(events[0].eventType).toBe('TaskCreated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/backend && npx vitest run tests/command-bus/
```

Expected: FAIL.

- [ ] **Step 3: Write `packages/backend/src/command-bus/command-bus.ts`**

```typescript
import { EventStore } from '../event-store/event-store';
import { StoredEvent } from '../types';
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
  constructor(private eventStore: EventStore) {}

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

    return this.eventStore.append(newEvents as Parameters<typeof this.eventStore.append>[0], expectedVersion);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/backend && npx vitest run tests/command-bus/
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Run all backend tests**

```bash
cd packages/backend && npx vitest run
```

Expected: All tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/command-bus/ packages/backend/tests/command-bus/
git commit -m "feat: CommandBus wires commands to domain aggregates"
```

---

**Phase 1 complete.** All 6 domain aggregates implemented with tests, event store persisting to PostgreSQL, and command bus routing commands.

Next: `2026-06-14-gtd-core-phase2-projections.md` — all 8 projectors + DB migrations + projector runner.

---

## Completion Summary

- **Date completed:** 2026-06-15
- **Total tasks:** 8
- **Total tests:** 28 (23 pure domain · 3 EventStore integration · 2 CommandBus integration)
- **Deviations from plan:**
  - Tasks 4–7 were implemented before Tasks 3 and 8 due to Docker Desktop not being running at start; execution order was 4→5→6→7→3→8 with no impact on correctness.
  - EventStore `id` column (BIGSERIAL) was returned as a string by the `pg` driver; fixed by casting `id::INT` in all three SQL queries. Not anticipated in the plan.
