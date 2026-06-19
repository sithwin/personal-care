# Logging Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thread `requestId` and `correlationId` through the full command pipeline and add structured `logEvent` logging to every component.

**Architecture:** A new `RequestContext { requestId, correlationId, log }` type flows explicitly from Express middleware → `CommandBus` → command handlers → `EventStore` → projectors → search indexers. `CommandBus.dispatch()` accepts `{ requestId, log }` from the HTTP layer and generates `correlationId` itself. Every component logs via a pre-bound pino child logger so IDs appear on every line automatically.

**Tech Stack:** Node.js 20, TypeScript 5, pino, Express, vitest

## Global Constraints

- `logEvent` field format: `'module.action'` dot-separated, e.g. `'taskCreate.handle'`, `'searchProjector.indexed'`
- `import type` for type-only imports — never mix value and type imports
- Named exports only — no `export default`
- `===` / `!==` always
- Never `any` — use `unknown` or specific types
- No `var` — `const` by default, `let` only when reassignment needed
- Unused parameters prefixed with `_`

---

## Phase 1 — Foundation (pure additions, nothing breaks)

### Task 1: Add `ILogger` port and `RequestContext` type

**Files:**
- Create: `packages/backend/src/application/ports/ILogger.ts`
- Create: `packages/backend/src/application/ports/RequestContext.ts`

**Interfaces:**
- Produces: `ILogger` interface, `RequestContext` interface — used by every subsequent task

- [ ] **Step 1: Create `ILogger.ts`**

```ts
export interface ILogger {
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  child(bindings: Record<string, unknown>): ILogger;
}
```

- [ ] **Step 2: Create `RequestContext.ts`**

```ts
import type { ILogger } from './ILogger';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  log: ILogger;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/application/ports/ILogger.ts packages/backend/src/application/ports/RequestContext.ts
git commit -m "feat(logging): add ILogger port and RequestContext type"
```

---

### Task 2: Add request context middleware, wire into app, update error handler

**Files:**
- Create: `packages/backend/src/api/middleware/request-context.ts`
- Modify: `packages/backend/src/index.ts`
- Modify: `packages/backend/src/api/middleware/error-handler.ts`

**Interfaces:**
- Consumes: nothing (pure addition)
- Produces: `req.requestId: string` on every Express request; `requestId` in error logs

- [ ] **Step 1: Create `request-context.ts`**

The middleware runs after `pino-http` (which sets `req.log`). It generates a UUID, stores it on `req`, and forks `req.log` to bind `requestId` to every subsequent log call from this request.

```ts
import { randomUUID } from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

export function requestContextMiddleware(
  req: import('express').Request,
  _res: import('express').Response,
  next: import('express').NextFunction,
): void {
  req.requestId = randomUUID();
  req.log = req.log.child({ requestId: req.requestId });
  next();
}
```

- [ ] **Step 2: Wire middleware into `index.ts`**

Add `requestContextMiddleware` import and insert it immediately after the `pinoHttp` middleware:

```ts
// add to imports at the top
import { requestContextMiddleware } from './api/middleware/request-context';
```

In the `main()` function, insert after `app.use(pinoHttp({ ... }))`:

```ts
app.use(requestContextMiddleware);
```

The full middleware block becomes:
```ts
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json({ limit: '10kb' }));
app.use(pinoHttp({
  logger,
  customLogLevel: (_req, res) => res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
}));
app.use(requestContextMiddleware);
```

- [ ] **Step 3: Update `error-handler.ts` to log `requestId`**

Change:
```ts
const context = { method: req.method, url: req.url, status, pgCode };
```

To:
```ts
const context = { requestId: req.requestId, method: req.method, url: req.url, status, pgCode };
```

- [ ] **Step 4: Verify TypeScript compiles and tests pass**

```bash
cd packages/backend && npx tsc --noEmit
npm test --workspace=packages/backend
```

Expected: no TS errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/api/middleware/request-context.ts packages/backend/src/index.ts packages/backend/src/api/middleware/error-handler.ts
git commit -m "feat(logging): add request context middleware and wire requestId into error handler"
```

---

## Phase 2 — Core pipeline plumbing (atomic — complete all tasks before running final tests)

> The interface changes in Task 3 will cause TypeScript errors until Tasks 4–8 are also complete. Run `tsc --noEmit` only after completing Task 8. You can still run tests per-task to check individual pieces.

### Task 3: Update all port interfaces

**Files:**
- Modify: `packages/backend/src/application/ports/ICommandBus.ts`
- Modify: `packages/backend/src/application/ports/ICommandHandler.ts`
- Modify: `packages/backend/src/application/ports/IEventStore.ts`
- Modify: `packages/backend/src/application/ports/IProjector.ts`

**Interfaces:**
- Consumes: `ILogger` from Task 1, `RequestContext` from Task 1
- Produces: updated port signatures used by Tasks 4–8

- [ ] **Step 1: Update `ICommandBus.ts`**

```ts
import type { StoredEvent } from '../../types';
import type { ILogger } from './ILogger';

export interface ICommandBus {
  dispatch(
    command: { type: string; payload: Record<string, unknown> },
    httpCtx: { requestId: string; log: ILogger },
  ): Promise<StoredEvent[]>;
}
```

- [ ] **Step 2: Update `ICommandHandler.ts`**

```ts
import type { StoredEvent } from '../../types';
import type { RequestContext } from './RequestContext';

export interface ICommandHandler<TCommand> {
  handle(cmd: TCommand, ctx: RequestContext): Promise<StoredEvent[]>;
}
```

- [ ] **Step 3: Update `IEventStore.ts`**

```ts
import type { DomainEvent } from '../../domain/shared/DomainEvent';
import type { StoredEvent } from '../../types';
import type { RequestContext } from './RequestContext';

export interface IEventStore {
  append(events: DomainEvent[], expectedVersion: number, ctx: RequestContext): Promise<StoredEvent[]>;
  getEvents(aggregateId: string): Promise<StoredEvent[]>;
  getAllEventsSince(afterId: number): Promise<StoredEvent[]>;
}
```

- [ ] **Step 4: Update `IProjector.ts`**

```ts
import type { StoredEvent } from '../../types';
import type { RequestContext } from './RequestContext';

export type Projector = (event: StoredEvent, ctx: RequestContext) => Promise<void>;
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/ports/ICommandBus.ts packages/backend/src/application/ports/ICommandHandler.ts packages/backend/src/application/ports/IEventStore.ts packages/backend/src/application/ports/IProjector.ts
git commit -m "feat(logging): update port interfaces to carry RequestContext"
```

---

### Task 4: Update `CommandBus`, `runner`, and their specs

**Files:**
- Modify: `packages/backend/src/infrastructure/command-bus/CommandBus.ts`
- Modify: `packages/backend/src/infrastructure/command-bus/CommandBus.spec.ts`
- Modify: `packages/backend/src/infrastructure/projections/runner.ts`

**Interfaces:**
- Consumes: `ICommandBus`, `ICommandHandler`, `IProjector`, `RequestContext` (from Task 3)
- Produces: updated `CommandBus.dispatch()` that generates `correlationId` and threads full `RequestContext`; updated `createProjectorRunner`

- [ ] **Step 1: Update `CommandBus.ts`**

```ts
import { randomUUID } from 'crypto';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
import type { ILogger } from '../../application/ports/ILogger';
import type { RequestContext } from '../../application/ports/RequestContext';
import type { StoredEvent } from '../../types';
import { childLogger } from '../logger';

const log = childLogger('CommandBus');

export class CommandBus implements ICommandBus {
  private readonly registry = new Map<string, (cmd: Record<string, unknown>, ctx: RequestContext) => Promise<StoredEvent[]>>();

  constructor(
    private readonly onEventsStored?: (events: StoredEvent[], ctx: RequestContext) => Promise<void>,
  ) {}

  register<TCmd>(commandType: string, handler: ICommandHandler<TCmd>): void {
    this.registry.set(commandType, (cmd, ctx) => handler.handle(cmd as TCmd, ctx));
  }

  async dispatch(
    command: { type: string; payload: Record<string, unknown> },
    httpCtx: { requestId: string; log: ILogger },
  ): Promise<StoredEvent[]> {
    const handler = this.registry.get(command.type);
    if (!handler) {
      log.warn({ commandType: command.type }, 'No handler registered for command');
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    const correlationId = randomUUID();
    const ctx: RequestContext = {
      requestId: httpCtx.requestId,
      correlationId,
      log: httpCtx.log.child({ correlationId }),
    };

    ctx.log.info({ logEvent: 'commandBus.received', commandType: command.type });
    const stored = await handler(command, ctx);
    ctx.log.info({ logEvent: 'commandBus.stored', commandType: command.type, events: stored.map(e => e.eventType) });

    await this.onEventsStored?.(stored, ctx);

    ctx.log.info({ logEvent: 'commandBus.projectorsComplete', commandType: command.type });
    return stored;
  }
}
```

- [ ] **Step 2: Update `runner.ts`**

```ts
import type { StoredEvent } from '../../types';
import type { Projector } from '../../application/ports/IProjector';
import type { RequestContext } from '../../application/ports/RequestContext';

export function createProjectorRunner(
  projectors: Projector[],
): (events: StoredEvent[], ctx: RequestContext) => Promise<void> {
  return async (events, ctx) => {
    for (const event of events) {
      for (const projector of projectors) {
        await projector(event, ctx);
      }
    }
  };
}
```

- [ ] **Step 3: Create a mock logger helper for specs**

This helper is shared by `CommandBus.spec.ts` and projector specs. Define it inline in `CommandBus.spec.ts` for now (it will be duplicated in projector specs — that is acceptable per task isolation).

- [ ] **Step 4: Update `CommandBus.spec.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from './CommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
import type { ILogger } from '../../application/ports/ILogger';
import type { RequestContext } from '../../application/ports/RequestContext';
import type { StoredEvent } from '../../types';

function makeStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'agg-1',
    aggregateType: 'test',
    eventType: 'TestCreated',
    payload: {},
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeMockLogger(): ILogger {
  const logger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}

const httpCtx = { requestId: 'req-1', log: makeMockLogger() };

describe('CommandBus', () => {
  it('routes to the registered handler', async () => {
    const bus = new CommandBus();
    const stored = [makeStoredEvent()];
    const handler: ICommandHandler<{ type: 'CreateFoo'; payload: { id: string } }> = {
      handle: vi.fn().mockResolvedValue(stored),
    };
    bus.register('CreateFoo', handler);
    const result = await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } }, httpCtx);
    expect(result).toBe(stored);
    expect(handler.handle).toHaveBeenCalledWith(
      { type: 'CreateFoo', payload: { id: '1' } },
      expect.objectContaining({ requestId: 'req-1', correlationId: expect.any(String) }),
    );
  });

  it('throws for unknown command type', async () => {
    const bus = new CommandBus();
    await expect(
      bus.dispatch({ type: 'UnknownCommand', payload: {} }, httpCtx),
    ).rejects.toThrow('No handler registered for command: UnknownCommand');
  });

  it('calls onEventsStored after handler returns', async () => {
    const onEventsStored = vi.fn().mockResolvedValue(undefined);
    const bus = new CommandBus(onEventsStored);
    const stored = [makeStoredEvent()];
    const handler: ICommandHandler<{ type: 'CreateFoo'; payload: { id: string } }> = {
      handle: vi.fn().mockResolvedValue(stored),
    };
    bus.register('CreateFoo', handler);
    await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } }, httpCtx);
    expect(onEventsStored).toHaveBeenCalledWith(
      stored,
      expect.objectContaining({ requestId: 'req-1', correlationId: expect.any(String) }),
    );
  });
});
```

- [ ] **Step 5: Run CommandBus tests**

```bash
npx vitest run packages/backend/src/infrastructure/command-bus/CommandBus.spec.ts
```

Expected: 3 tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/infrastructure/command-bus/CommandBus.ts packages/backend/src/infrastructure/command-bus/CommandBus.spec.ts packages/backend/src/infrastructure/projections/runner.ts
git commit -m "feat(logging): update CommandBus to generate correlationId and thread RequestContext; update runner"
```

---

### Task 5: Update `EventStore`

**Files:**
- Modify: `packages/backend/src/infrastructure/persistence/EventStore.ts`

**Interfaces:**
- Consumes: `RequestContext` from Task 1, updated `IEventStore` from Task 3
- Produces: `EventStore.append()` that accepts ctx and logs `eventStore.appended`

- [ ] **Step 1: Update `EventStore.ts`**

```ts
import type { Pool } from 'pg';
import type { StoredEvent } from '../../types';
import type { IEventStore } from '../../application/ports/IEventStore';
import type { DomainEvent } from '../../domain/shared/DomainEvent';
import type { RequestContext } from '../../application/ports/RequestContext';
import { childLogger } from '../logger';

const log = childLogger('EventStore');

export class EventStore implements IEventStore {
  constructor(private readonly pool: Pool) {}

  async append(events: DomainEvent[], expectedVersion: number, ctx: RequestContext): Promise<StoredEvent[]> {
    if (events.length === 0) return [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const stored: StoredEvent[] = [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const version = expectedVersion + i + 1;
        try {
          const result = await client.query<StoredEvent>(
            `INSERT INTO events (aggregate_id, aggregate_type, event_type, payload, version)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
                       event_type as "eventType", payload, version, created_at as "createdAt"`,
            [event.aggregateId, event.aggregateType, event.eventType, JSON.stringify(event.payload), version],
          );
          stored.push(result.rows[0]);
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('unique')) {
            const msg = `Concurrency conflict on aggregate ${event.aggregateId} at version ${version}`;
            ctx.log.warn({ logEvent: 'eventStore.concurrencyConflict', aggregateId: event.aggregateId, version }, msg);
            throw new Error(msg);
          }
          ctx.log.error({ logEvent: 'eventStore.appendFailed', err, aggregateId: event.aggregateId }, 'Unexpected error appending event');
          throw err;
        }
      }
      await client.query('COMMIT');
      ctx.log.info({
        logEvent: 'eventStore.appended',
        aggregateId: events[0].aggregateId,
        eventTypes: stored.map(e => e.eventType),
        count: stored.length,
      });
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
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE aggregate_id = $1 ORDER BY version ASC`,
      [aggregateId],
    );
    return result.rows;
  }

  async getAllEventsSince(afterId: number): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE id > $1 ORDER BY id ASC`,
      [afterId],
    );
    return result.rows;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/infrastructure/persistence/EventStore.ts
git commit -m "feat(logging): update EventStore.append to accept RequestContext and log appended events"
```

---

### Task 6: Update all 33 command handlers

**Files (all modify only):**
- `packages/backend/src/application/command-handlers/balance-rule/CreateBalanceRuleHandler.ts`
- `packages/backend/src/application/command-handlers/balance-rule/UpdateBalanceRuleHandler.ts`
- `packages/backend/src/application/command-handlers/balance-rule/DeleteBalanceRuleHandler.ts`
- `packages/backend/src/application/command-handlers/category/CreateCategoryHandler.ts`
- `packages/backend/src/application/command-handlers/category/UpdateCategoryHandler.ts`
- `packages/backend/src/application/command-handlers/category/DeleteCategoryHandler.ts`
- `packages/backend/src/application/command-handlers/item/CreateItemHandler.ts`
- `packages/backend/src/application/command-handlers/item/MarkItemAvailableHandler.ts`
- `packages/backend/src/application/command-handlers/item/MarkItemConsumedHandler.ts`
- `packages/backend/src/application/command-handlers/item/MarkItemAvailableAgainHandler.ts`
- `packages/backend/src/application/command-handlers/task/CreateTaskHandler.ts`
- `packages/backend/src/application/command-handlers/task/UpdateTaskHandler.ts`
- `packages/backend/src/application/command-handlers/task/StartTaskHandler.ts`
- `packages/backend/src/application/command-handlers/task/CompleteTaskHandler.ts`
- `packages/backend/src/application/command-handlers/task/AddItemRequirementHandler.ts`
- `packages/backend/src/application/command-handlers/task/RemoveItemRequirementHandler.ts`
- `packages/backend/src/application/command-handlers/task/AttachResourceToTaskHandler.ts`
- `packages/backend/src/application/command-handlers/task/DetachResourceFromTaskHandler.ts`
- `packages/backend/src/application/command-handlers/task/SetTaskRecurrenceHandler.ts`
- `packages/backend/src/application/command-handlers/task/SkipRecurrenceHandler.ts`
- `packages/backend/src/application/command-handlers/task/ScheduleTaskHandler.ts`
- `packages/backend/src/application/command-handlers/task/PromoteToProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/CreateProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/AddTaskToProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/CompleteProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/PlanProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/StartProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/PauseProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/ResumeProjectHandler.ts`
- `packages/backend/src/application/command-handlers/project/UpdateProjectHandler.ts`
- `packages/backend/src/application/command-handlers/resource/CreateResourceHandler.ts`
- `packages/backend/src/application/command-handlers/resource/UpdateResourceHandler.ts`
- `packages/backend/src/application/command-handlers/resource/DeleteResourceHandler.ts`

**Interfaces:**
- Consumes: `RequestContext` from Task 1, updated `ICommandHandler` from Task 3, updated `IEventStore` from Task 3
- Produces: all handlers with `ctx: RequestContext` parameter, logEvent entry + completion logs

**Pattern — every handler follows this exact structure:**

```
1. Add `import type { RequestContext } from '../../ports/RequestContext';`
2. Change `handle(cmd: XCommand): Promise<StoredEvent[]>` to `handle(cmd: XCommand, ctx: RequestContext): Promise<StoredEvent[]>`
3. Log entry: `ctx.log.info({ logEvent: '<camelName>.handle', payload: { id: cmd.payload.id } })`
4. Pass `ctx` to every `this.eventStore.append(events, version, ctx)` call
5. Log completion: `ctx.log.info({ logEvent: '<camelName>.persisted', payload: { id: cmd.payload.id } })`
```

The `<camelName>` is the command type in camelCase with the `Command` suffix removed, e.g. `CreateTaskCommand` → `createTask`.

**Full example — `CreateTaskHandler.ts`:**

```ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateTaskCommand } from '../../../domain/task/commands/CreateTaskCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Task } from '../../../domain/task/Task';

export class CreateTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateTaskCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createTask.handle', payload: { id: cmd.payload.id } });
    const event = Task.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createTask.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
```

**Full example — `CompleteTaskHandler.ts`** (handler that loads history first):

```ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CompleteTaskCommand } from '../../../domain/task/commands/CompleteTaskCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Task } from '../../../domain/task/Task';

export class CompleteTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CompleteTaskCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'completeTask.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const events = aggregate.complete(cmd);
    const stored = await this.eventStore.append(events, history.length, ctx);
    ctx.log.info({ logEvent: 'completeTask.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
```

**Full example — `CreateCategoryHandler.ts`:**

```ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateCategoryCommand } from '../../../domain/category/commands/CreateCategoryCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Category } from '../../../domain/category/Category';

export class CreateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateCategoryCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createCategory.handle', payload: { id: cmd.payload.id } });
    const event = Category.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createCategory.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
```

**`logEvent` names for all 33 handlers:**

| Handler | `.handle` | `.persisted` |
|---|---|---|
| CreateBalanceRuleHandler | `createBalanceRule.handle` | `createBalanceRule.persisted` |
| UpdateBalanceRuleHandler | `updateBalanceRule.handle` | `updateBalanceRule.persisted` |
| DeleteBalanceRuleHandler | `deleteBalanceRule.handle` | `deleteBalanceRule.persisted` |
| CreateCategoryHandler | `createCategory.handle` | `createCategory.persisted` |
| UpdateCategoryHandler | `updateCategory.handle` | `updateCategory.persisted` |
| DeleteCategoryHandler | `deleteCategory.handle` | `deleteCategory.persisted` |
| CreateItemHandler | `createItem.handle` | `createItem.persisted` |
| MarkItemAvailableHandler | `markItemAvailable.handle` | `markItemAvailable.persisted` |
| MarkItemConsumedHandler | `markItemConsumed.handle` | `markItemConsumed.persisted` |
| MarkItemAvailableAgainHandler | `markItemAvailableAgain.handle` | `markItemAvailableAgain.persisted` |
| CreateTaskHandler | `createTask.handle` | `createTask.persisted` |
| UpdateTaskHandler | `updateTask.handle` | `updateTask.persisted` |
| StartTaskHandler | `startTask.handle` | `startTask.persisted` |
| CompleteTaskHandler | `completeTask.handle` | `completeTask.persisted` |
| AddItemRequirementHandler | `addItemRequirement.handle` | `addItemRequirement.persisted` |
| RemoveItemRequirementHandler | `removeItemRequirement.handle` | `removeItemRequirement.persisted` |
| AttachResourceToTaskHandler | `attachResourceToTask.handle` | `attachResourceToTask.persisted` |
| DetachResourceFromTaskHandler | `detachResourceFromTask.handle` | `detachResourceFromTask.persisted` |
| SetTaskRecurrenceHandler | `setTaskRecurrence.handle` | `setTaskRecurrence.persisted` |
| SkipRecurrenceHandler | `skipRecurrence.handle` | `skipRecurrence.persisted` |
| ScheduleTaskHandler | `scheduleTask.handle` | `scheduleTask.persisted` |
| PromoteToProjectHandler | `promoteToProject.handle` | `promoteToProject.persisted` |
| CreateProjectHandler | `createProject.handle` | `createProject.persisted` |
| AddTaskToProjectHandler | `addTaskToProject.handle` | `addTaskToProject.persisted` |
| CompleteProjectHandler | `completeProject.handle` | `completeProject.persisted` |
| PlanProjectHandler | `planProject.handle` | `planProject.persisted` |
| StartProjectHandler | `startProject.handle` | `startProject.persisted` |
| PauseProjectHandler | `pauseProject.handle` | `pauseProject.persisted` |
| ResumeProjectHandler | `resumeProject.handle` | `resumeProject.persisted` |
| UpdateProjectHandler | `updateProject.handle` | `updateProject.persisted` |
| CreateResourceHandler | `createResource.handle` | `createResource.persisted` |
| UpdateResourceHandler | `updateResource.handle` | `updateResource.persisted` |
| DeleteResourceHandler | `deleteResource.handle` | `deleteResource.persisted` |

> Note: For handlers like `DeleteBalanceRuleHandler` and `DeleteCategoryHandler` the command payload has `id`. For handlers that don't have `cmd.payload.id` (check the command type), log whatever the primary identifier is (e.g. `taskId`, `ruleId`).

- [ ] **Step 1: Update all 33 handlers** following the pattern above

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/application/command-handlers/
git commit -m "feat(logging): add RequestContext + logEvent logs to all command handlers"
```

---

### Task 7: Update `commands.router.ts`, its spec, and `seed.ts`

**Files:**
- Modify: `packages/backend/src/api/routes/commands.router.ts`
- Modify: `packages/backend/src/api/routes/commands.router.spec.ts`
- Modify: `packages/backend/src/seed/seed.ts`

**Interfaces:**
- Consumes: updated `ICommandBus` from Task 3, `req.requestId` from Task 2

- [ ] **Step 1: Update `commands.router.ts`**

```ts
import { Router } from 'express';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { asyncHandler } from '../utils/async-handler';
import { validateCommand } from '../middleware/validate-command';
import { commandSchemas } from '../validation';

export function makeCommandsRouter(bus: ICommandBus): Router {
  const router = Router();

  router.post('/:type', validateCommand(commandSchemas), asyncHandler(async (req, res) => {
    const command = { type: req.params.type, payload: req.body as Record<string, unknown> };
    const events = await bus.dispatch(command, { requestId: req.requestId, log: req.log });
    res.status(201).json({
      events: events.map(e => ({ id: e.id, eventType: e.eventType, aggregateId: e.aggregateId })),
    });
  }));

  return router;
}
```

- [ ] **Step 2: Update `commands.router.spec.ts`**

The spec uses a mock bus. Update the `bus.dispatch` expectation to expect the second `httpCtx` argument and add `requestContextMiddleware` to the test app:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import type { StoredEvent } from '../../types';
import { makeCommandsRouter } from './commands.router';
import { errorHandler } from '../middleware/error-handler';
import { AppError } from '../errors/app-error';
import { requestContextMiddleware } from '../middleware/request-context';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';
const VALID_CATEGORY_UUID = '22222222-2222-2222-2222-222222222222';

function makeStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'agg-1',
    aggregateType: 'test',
    eventType: 'TestCreated',
    payload: { foo: 'bar' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('commands router', () => {
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    bus = { dispatch: vi.fn() };

    const app = express();
    app.use(express.json());
    // pino-http is not used in tests; manually add a log shim so requestContextMiddleware can call req.log.child
    app.use((req, _res, next) => {
      (req as unknown as { log: { child: () => unknown } }).log = { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) }) };
      next();
    });
    app.use(requestContextMiddleware);
    app.use('/commands', makeCommandsRouter(bus));
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

  it('dispatches a command built from the URL type and request body', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([makeStoredEvent()]);

    await fetch(`${baseUrl}/commands/CreateTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID, name: 'Buy milk', categoryId: VALID_CATEGORY_UUID }),
    });

    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CreateTaskCommand', payload: { id: VALID_UUID, name: 'Buy milk', categoryId: VALID_CATEGORY_UUID } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('returns 201 with the events mapped to id, eventType and aggregateId', async () => {
    const stored = [
      makeStoredEvent({ id: 1, eventType: 'TaskCreated', aggregateId: 'task-1' }),
      makeStoredEvent({ id: 2, eventType: 'TaskScheduled', aggregateId: 'task-1' }),
    ];
    vi.mocked(bus.dispatch).mockResolvedValue(stored);

    const res = await fetch(`${baseUrl}/commands/CreateTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID, name: 'Buy milk', categoryId: VALID_CATEGORY_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({
      events: [
        { id: 1, eventType: 'TaskCreated', aggregateId: 'task-1' },
        { id: 2, eventType: 'TaskScheduled', aggregateId: 'task-1' },
      ],
    });
  });

  it('returns an empty events array when the bus reports no events', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/commands/StartTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ events: [] });
  });

  it('propagates the status and message of an AppError thrown by the bus', async () => {
    vi.mocked(bus.dispatch).mockRejectedValue(new AppError('Concurrency conflict', 409));

    const res = await fetch(`${baseUrl}/commands/StartTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toMatchObject({ success: false, message: 'Concurrency conflict' });
  });

  it('falls back to a 500 response for unexpected errors', async () => {
    vi.mocked(bus.dispatch).mockRejectedValue(new Error('boom'));

    const res = await fetch(`${baseUrl}/commands/StartTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: VALID_UUID }),
    });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toMatchObject({ success: false, message: 'boom' });
  });

  it('returns 400 without calling the bus when the command type is unknown', async () => {
    const res = await fetch(`${baseUrl}/commands/Bogus`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ success: false, message: 'Unknown command type: Bogus' });
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('returns 400 with validation details without calling the bus when the payload is invalid', async () => {
    const res = await fetch(`${baseUrl}/commands/CreateTaskCommand`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'not-a-uuid' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ error: 'Validation failed' });
    expect(bus.dispatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Update `seed.ts`**

The seed runs at startup outside of any HTTP request. Pass a system context:

```ts
import { type Pool } from 'pg';
import { randomUUID } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { ICommandBus } from '../application/ports/ICommandBus';
import { childLogger } from '../infrastructure/logger';

const log = childLogger('seed');

export async function seed(bus: ICommandBus, pool: Pool): Promise<void> {
  const existing = await pool.query(`SELECT id FROM categories_view WHERE name IN ('Health', 'Study') AND is_default = true`);
  if (existing.rows.length >= 2) {
    log.debug('Seed skipped — built-in categories already exist');
    return;
  }

  const seedCtx = { requestId: 'system', log };

  const healthId = uuidv4();
  const studyId = uuidv4();

  await bus.dispatch({ type: 'CreateCategoryCommand', payload: { id: healthId, name: 'Health', icon: '💪', color: '#ef4444', isDefault: true } }, seedCtx);
  await bus.dispatch({ type: 'CreateCategoryCommand', payload: { id: studyId, name: 'Study', icon: '📚', color: '#8b5cf6', isDefault: true } }, seedCtx);

  await bus.dispatch({ type: 'CreateBalanceRuleCommand', payload: { id: uuidv4(), categoryId: healthId, minimumCount: 1, frequency: 'daily', dayRestriction: null } }, seedCtx);
  await bus.dispatch({ type: 'CreateBalanceRuleCommand', payload: { id: uuidv4(), categoryId: studyId, minimumCount: 1, frequency: 'daily', dayRestriction: null } }, seedCtx);

  const userCats = await pool.query(`SELECT id, name FROM categories_view WHERE name IN ('Home', 'Cars') AND is_default = false`);
  for (const cat of userCats.rows) {
    const existingRule = await pool.query('SELECT id FROM balance_rules_view WHERE category_id = $1', [cat.id]);
    if (existingRule.rows.length > 0) continue;

    if (cat.name === 'Home') {
      await bus.dispatch({ type: 'CreateBalanceRuleCommand', payload: { id: uuidv4(), categoryId: cat.id, minimumCount: 1, frequency: 'weekly', dayRestriction: 'weekend' } }, seedCtx);
    } else if (cat.name === 'Cars') {
      await bus.dispatch({ type: 'CreateBalanceRuleCommand', payload: { id: uuidv4(), categoryId: cat.id, minimumCount: 1, frequency: 'monthly', dayRestriction: null } }, seedCtx);
    }
  }

  log.info('Seed complete: Health and Study categories + balance rules created');
}
```

- [ ] **Step 4: Run router tests**

```bash
npx vitest run packages/backend/src/api/routes/commands.router.spec.ts
```

Expected: all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/api/routes/commands.router.ts packages/backend/src/api/routes/commands.router.spec.ts packages/backend/src/seed/seed.ts
git commit -m "feat(logging): update commands router and seed to pass httpCtx to bus.dispatch"
```

---

### Task 8: Stub all projectors with `_ctx` to restore TypeScript compilation

**Files (all modify only):**
- `packages/backend/src/infrastructure/projections/tasks.projector.ts`
- `packages/backend/src/infrastructure/projections/items.projector.ts`
- `packages/backend/src/infrastructure/projections/categories.projector.ts`
- `packages/backend/src/infrastructure/projections/resources.projector.ts`
- `packages/backend/src/infrastructure/projections/balance.projector.ts`
- `packages/backend/src/infrastructure/projections/dashboard.projector.ts`
- `packages/backend/src/infrastructure/projections/projects.projector.ts`
- `packages/backend/src/infrastructure/projections/tasks-search.projector.ts`
- `packages/backend/src/infrastructure/projections/items-search.projector.ts`
- `packages/backend/src/infrastructure/projections/projects-search.projector.ts`
- `packages/backend/src/infrastructure/projections/tasks.projector.spec.ts`
- `packages/backend/src/infrastructure/projections/items.projector.spec.ts`

**Purpose:** Add `_ctx: RequestContext` as a second parameter to every projector function so TypeScript compiles again. Logging will be added in Phases 3 and 4.

- [ ] **Step 1: Add `_ctx` stub to all 7 read-model projectors**

For each projector, add the import and change the returned async function signature.

**`tasks.projector.ts` — change signature:**
```ts
import type { RequestContext } from '../../application/ports/RequestContext';
// ...
export function createTasksProjector(taskRepo: ITaskViewRepository, itemRepo: IItemViewRepository): Projector {
  return async (event, _ctx) => {
    // ...existing body unchanged...
  };
}
```

**`items.projector.ts`:**
```ts
import type { RequestContext } from '../../application/ports/RequestContext';
// ...
export function createItemsProjector(itemRepo: IItemViewRepository, taskRepo: ITaskViewRepository): Projector {
  return async (event, _ctx) => {
    // ...existing body unchanged...
  };
}
```

Apply the same pattern (`return async (event, _ctx) => {`) to:
- `categories.projector.ts`
- `resources.projector.ts`
- `balance.projector.ts`
- `dashboard.projector.ts`
- `projects.projector.ts`

**`tasks-search.projector.ts`:**
```ts
import type { RequestContext } from '../../application/ports/RequestContext';
// ...
export function createTasksSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event, _ctx) => {
    // ...existing body unchanged...
  };
}
```

Apply same to `items-search.projector.ts` and `projects-search.projector.ts`.

- [ ] **Step 2: Update projector specs to pass a mock ctx**

Both `tasks.projector.spec.ts` and `items.projector.spec.ts` call projectors directly with a single `StoredEvent`. Add a mock ctx to all calls.

Add this helper at the top of each spec file (after imports):

```ts
import type { RequestContext } from '../../application/ports/RequestContext';

function makeMockCtx(): RequestContext {
  const log = {
    info: () => {},
    warn: () => {},
    error: () => {},
    child: function() { return this; },
  };
  return { requestId: 'test', correlationId: 'test-corr', log };
}
```

Then update every projector call to pass `makeMockCtx()` as second argument, e.g.:

```ts
// Before:
await tasksProjector({ id: 1, ..., eventType: 'TaskCreated', ... });

// After:
await tasksProjector({ id: 1, ..., eventType: 'TaskCreated', ... }, makeMockCtx());
```

Apply this change to every projector call in both spec files.

- [ ] **Step 3: Verify TypeScript compiles and all tests pass**

```bash
cd packages/backend && npx tsc --noEmit
npm test --workspace=packages/backend
```

Expected: no TS errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/infrastructure/projections/
git commit -m "feat(logging): stub RequestContext on all projectors to restore TypeScript compilation"
```

---

## Phase 3 — Read-model projector logging

### Task 9: Add `logEvent` logging to all 7 read-model projectors

**Files:**
- Modify: `packages/backend/src/infrastructure/projections/tasks.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/items.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/categories.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/resources.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/balance.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/dashboard.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/projects.projector.ts`

**Pattern:** Replace `_ctx` with `ctx`, then add log calls around each case's awaited work.

```ts
case 'TaskCreated': {
  ctx.log.info({ logEvent: 'tasksProjector.projecting', eventType: event.eventType, id: p.id });
  // ...existing work...
  ctx.log.info({ logEvent: 'tasksProjector.projected', eventType: event.eventType, id: p.id });
  break;
}
```

> Do not wrap the entire switch in a single log pair — log per-case so you know exactly which event type was processed.

**`logEvent` names per projector:**

| Projector | `logEvent` prefix |
|---|---|
| tasks.projector | `tasksProjector` |
| items.projector | `itemsProjector` |
| categories.projector | `categoriesProjector` |
| resources.projector | `resourcesProjector` |
| balance.projector | `balanceProjector` |
| dashboard.projector | `dashboardProjector` |
| projects.projector | `projectsProjector` |

**Full example — `tasks.projector.ts` (showing two cases; apply same pattern to all):**

```ts
import type { Projector } from '../../application/ports/IProjector';
import type { ITaskViewRepository } from '../../application/ports/ITaskViewRepository';
import type { IItemViewRepository } from '../../application/ports/IItemViewRepository';
import type { RequestContext } from '../../application/ports/RequestContext';
import { deriveTaskStatus } from '../../application/services/task-status';

async function refreshTaskStatus(taskId: string, taskRepo: ITaskViewRepository): Promise<void> {
  const task = await taskRepo.findById(taskId);
  if (!task) return;
  const itemStatuses = await taskRepo.getItemStatusesForTask(taskId);
  await taskRepo.updateStatus(taskId, deriveTaskStatus(task, itemStatuses));
}

export function createTasksProjector(taskRepo: ITaskViewRepository, itemRepo: IItemViewRepository): Projector {
  return async (event, ctx) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'TaskCreated': {
        ctx.log.info({ logEvent: 'tasksProjector.projecting', eventType: event.eventType, id: p.id });
        const dur = p.estimatedDuration as { value: number; unit: string } | undefined;
        await taskRepo.insert({
          id: p.id as string,
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          categoryId: p.categoryId as string,
          projectId: (p.projectId as string | undefined) ?? null,
          dueDate: (p.dueDate as string | undefined) ?? null,
          estimatedDurationValue: dur?.value ?? null,
          estimatedDurationUnit: dur?.unit ?? null,
        });
        await refreshTaskStatus(p.id as string, taskRepo);
        ctx.log.info({ logEvent: 'tasksProjector.projected', eventType: event.eventType, id: p.id });
        break;
      }

      case 'TaskStarted':
        ctx.log.info({ logEvent: 'tasksProjector.projecting', eventType: event.eventType, id: p.id });
        await taskRepo.markStarted(p.id as string);
        await refreshTaskStatus(p.id as string, taskRepo);
        ctx.log.info({ logEvent: 'tasksProjector.projected', eventType: event.eventType, id: p.id });
        break;

      // ... apply same pattern to every other case ...

      default:
        break;
    }
  };
}
```

Apply this same pattern to all 7 read-model projectors. For `dashboard.projector.ts`, which has no switch, wrap the body:

```ts
export function createDashboardProjector(dashboardRepo: IDashboardViewRepository): Projector {
  return async (event, ctx) => {
    if (TASK_EVENTS.has(event.eventType) || ITEM_EVENTS.has(event.eventType)) {
      ctx.log.info({ logEvent: 'dashboardProjector.projecting', eventType: event.eventType });
      await dashboardRepo.refresh();
      ctx.log.info({ logEvent: 'dashboardProjector.projected', eventType: event.eventType });
    }
  };
}
```

- [ ] **Step 1: Update all 7 projectors** with `ctx` logs as shown above

- [ ] **Step 2: Run projector tests**

```bash
npx vitest run packages/backend/src/infrastructure/projections/tasks.projector.spec.ts packages/backend/src/infrastructure/projections/items.projector.spec.ts
```

Expected: all tests pass

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/infrastructure/projections/tasks.projector.ts packages/backend/src/infrastructure/projections/items.projector.ts packages/backend/src/infrastructure/projections/categories.projector.ts packages/backend/src/infrastructure/projections/resources.projector.ts packages/backend/src/infrastructure/projections/balance.projector.ts packages/backend/src/infrastructure/projections/dashboard.projector.ts packages/backend/src/infrastructure/projections/projects.projector.ts
git commit -m "feat(logging): add logEvent logging to all read-model projectors"
```

---

## Phase 4 — Search layer alignment

### Task 10: Add `logEvent` logging to search projectors and align `MeilisearchSearchIndexer`

**Files:**
- Modify: `packages/backend/src/infrastructure/projections/tasks-search.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/items-search.projector.ts`
- Modify: `packages/backend/src/infrastructure/projections/projects-search.projector.ts`
- Modify: `packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.ts`
- Modify: `packages/backend/src/infrastructure/search/bootstrapSearchIndex.ts`

**Interfaces:**
- Consumes: `RequestContext` from Task 1, updated `Projector` type from Task 3

- [ ] **Step 1: Update `tasks-search.projector.ts`**

Replace the module-level `const log = childLogger(...)` and all `[4a]`/`[4b]` log strings. Remove the `childLogger` import. Use `ctx.log` throughout. The `try/catch` error log also uses `ctx.log`.

```ts
import type { Projector } from '../../application/ports/IProjector';
import type { ISearchIndexer, SearchDocument } from '../../application/ports/ISearchIndexer';

export function createTasksSearchProjector(indexer: ISearchIndexer): Projector {
  return async (event, ctx) => {
    try {
      const p = event.payload as Record<string, unknown>;
      switch (event.eventType) {
        case 'TaskCreated':
          ctx.log.info({ logEvent: 'searchProjector.indexing', eventType: event.eventType, id: p.id });
          await indexer.upsert({
            id: `task-${p.id as string}`,
            entityId: p.id as string,
            type: 'task',
            name: p.name as string,
            description: (p.description as string | undefined) ?? null,
            status: 'ready',
            categoryId: p.categoryId as string,
          });
          ctx.log.info({ logEvent: 'searchProjector.indexed', eventType: event.eventType, id: p.id });
          break;
        case 'TaskUpdated': {
          const fields: Record<string, unknown> = {};
          if (p.name !== undefined) fields.name = p.name as string;
          if (p.description !== undefined) fields.description = p.description as string | null;
          if (p.categoryId !== undefined) fields.categoryId = p.categoryId as string;
          if (Object.keys(fields).length > 0) {
            ctx.log.info({ logEvent: 'searchProjector.indexing', eventType: event.eventType, id: p.id });
            await indexer.patch(`task-${p.id as string}`, fields as Partial<Omit<SearchDocument, 'id'>>);
            ctx.log.info({ logEvent: 'searchProjector.indexed', eventType: event.eventType, id: p.id });
          }
          break;
        }
        case 'TaskStarted':
          ctx.log.info({ logEvent: 'searchProjector.indexing', eventType: event.eventType, id: p.id });
          await indexer.patch(`task-${p.id as string}`, { status: 'ongoing' });
          ctx.log.info({ logEvent: 'searchProjector.indexed', eventType: event.eventType, id: p.id });
          break;
        case 'TaskCompleted':
          ctx.log.info({ logEvent: 'searchProjector.indexing', eventType: event.eventType, id: p.id });
          await indexer.patch(`task-${p.id as string}`, { status: 'done' });
          ctx.log.info({ logEvent: 'searchProjector.indexed', eventType: event.eventType, id: p.id });
          break;
        default:
          break;
      }
    } catch (err) {
      ctx.log.error({ logEvent: 'searchProjector.failed', err, eventType: event.eventType }, 'search indexing failed — command not affected');
    }
  };
}
```

- [ ] **Step 2: Update `items-search.projector.ts`**

Apply the same transformation — replace `log.info({ ... }, '[4a]...')` / `log.info({ ... }, '[4b]...')` with `ctx.log.info({ logEvent: 'searchProjector.indexing', ... })` / `ctx.log.info({ logEvent: 'searchProjector.indexed', ... })`. Replace the catch block with `ctx.log.error({ logEvent: 'searchProjector.failed', ... })`. Remove the module-level `log` constant and `childLogger` import.

- [ ] **Step 3: Update `projects-search.projector.ts`**

Apply the same transformation as Step 2.

- [ ] **Step 4: Update `MeilisearchSearchIndexer.ts`**

Replace existing log calls to use the `logEvent` convention. The `childLogger` import stays (used for the module-level logger). The `log` constant stays since it is used in `bootstrap` which doesn't receive a `ctx`.

```ts
// In upsert():
log.error({ logEvent: 'searchIndexer.upsertFailed', error: result.error, id: doc.id }, 'upsert task failed');

// In patch():
log.error({ logEvent: 'searchIndexer.patchFailed', error: result.error, id }, 'patch task failed');

// In ensureIndex():
log.error({ logEvent: 'searchIndexer.ensureIndexFailed', error: result.error }, 'ensureIndex settings task failed');

// In bootstrap():
log.error({ logEvent: 'searchIndexer.bootstrapFailed', error: result.error, count: docs.length }, 'bootstrap task failed');
log.info({ logEvent: 'searchIndexer.bootstrapped', count: docs.length }, 'bootstrap task succeeded');
```

- [ ] **Step 5: Update `bootstrapSearchIndex.ts`**

Replace existing log calls:
```ts
// skip:
log.info({ logEvent: 'searchIndexer.bootstrapSkipped', count }, 'index already populated — skipping bootstrap');

// nothing to bootstrap:
log.info({ logEvent: 'searchIndexer.bootstrapEmpty' }, 'no existing data in DB views — nothing to bootstrap');

// starting:
log.info({ logEvent: 'searchIndexer.bootstrapping', total: docs.length }, 'bootstrapping Meilisearch with existing docs');

// complete:
log.info({ logEvent: 'searchIndexer.bootstrapped', total: docs.length }, 'bootstrap complete');
```

- [ ] **Step 6: Verify TypeScript compiles and all tests pass**

```bash
cd packages/backend && npx tsc --noEmit
npm test --workspace=packages/backend
```

Expected: no TS errors, all tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/infrastructure/projections/tasks-search.projector.ts packages/backend/src/infrastructure/projections/items-search.projector.ts packages/backend/src/infrastructure/projections/projects-search.projector.ts packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.ts packages/backend/src/infrastructure/search/bootstrapSearchIndex.ts
git commit -m "feat(logging): align search projectors and indexer to logEvent convention"
```

---

## Completion summary template

After finishing all tasks, update this plan:

```
## Completion

- Date completed: YYYY-MM-DD
- Total tasks: 10
- Total tests updated: (count)
- Deviations from plan: (list any, or "none")
```
