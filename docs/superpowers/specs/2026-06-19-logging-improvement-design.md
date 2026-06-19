# Logging Improvement Design

**Date:** 2026-06-19
**Status:** Approved

## Goals

1. Every component in the pipeline logs entry and completion (and errors).
2. All log records use a structured `logEvent: 'module.action'` field for easy grep/search.
3. Each HTTP request carries a `requestId` (UUID) visible across the full pipeline log.
4. Each command dispatch carries a `correlationId` (UUID) that links the handler, EventStore, projectors, and search indexers for that specific command.

## Approach: context-bound child logger with explicit threading

`requestId` and `correlationId` are generated at runtime and flow explicitly through function signatures. Every component receives a pre-bound `ILogger` (a pino child) that already has both IDs attached — no ID needs to be spread into every individual log call.

No DB migration is needed. `correlationId` and `requestId` are runtime-only — they live in `RequestContext` and are logged by every component via `ctx.log`.

## New types

### `application/ports/ILogger.ts`

A minimal logger interface so the application layer does not depend on pino directly. pino satisfies it structurally.

```ts
export interface ILogger {
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  child(bindings: Record<string, unknown>): ILogger;
}
```

### `application/ports/RequestContext.ts`

```ts
import type { ILogger } from './ILogger';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  log: ILogger;
}
```

## Pipeline propagation

```
Express middleware
  → requestId = randomUUID()
  → req.log = logger.child({ requestId })

Route handler
  → bus.dispatch(command, { requestId: req.requestId, log: req.log })

CommandBus.dispatch()
  → correlationId = randomUUID()
  → ctx = { requestId, correlationId, log: httpCtx.log.child({ correlationId }) }
  → handler.handle(cmd, ctx)
  → eventStore.append(events, version, ctx)
  → onEventsStored(stored, ctx)   ← projectors
  → logs: commandBus.received, commandBus.stored, commandBus.projectorsComplete

EventStore.append()
  → logs: eventStore.appended (on success), eventStore.concurrencyConflict (on conflict error)

Command handlers (all 26)
  → handle(cmd, ctx)
  → pass ctx to eventStore.append()
  → logs: <aggregate><Action>.handle, <aggregate><Action>.persisted
    e.g. taskCreate.handle, taskCreate.persisted

Read-model projectors (7)
  → projector(event, ctx)
  → logs: <projector>.projecting, <projector>.projected per event type
    e.g. tasksProjector.projecting, tasksProjector.projected

Search projectors (3)
  → projector(event, ctx)
  → logs: searchProjector.indexing, searchProjector.indexed, searchProjector.failed

MeilisearchSearchIndexer
  → align existing error/bootstrap logs to logEvent convention
```

## Signature changes

| Interface / type | Change |
|---|---|
| `ICommandBus.dispatch()` | add second arg `httpCtx: { requestId: string; log: ILogger }` |
| `ICommandHandler.handle()` | add second arg `ctx: RequestContext` |
| `IEventStore.append()` | add third arg `ctx: RequestContext` |
| `Projector` | `(event: StoredEvent, ctx: RequestContext) => Promise<void>` |
| `CommandBus.dispatch()` | generate `correlationId`, fork logger, build `RequestContext`, thread through |
| `EventStore.append()` | accept and use `ctx` for logging |
| All 26 command handlers | accept `ctx`, pass to `append()`, add entry + completion logs |
| All route handlers (~26) | pass `{ requestId: req.requestId, log: req.log }` to `bus.dispatch()` |
| All 7 read-model projectors | accept `ctx`, add `logEvent` logs |
| All 3 search projectors | accept `ctx`, replace `[4a]`/`[4b]` strings with `logEvent` |
| `MeilisearchSearchIndexer` | align to `logEvent` convention |

## `logEvent` convention

All log calls use `logEvent: 'module.action'` in dot-separated past-or-present tense:

```ts
ctx.log.info({ logEvent: 'commandBus.received', commandType: command.type })
ctx.log.info({ logEvent: 'taskCreate.persisted', payload: { id } })
ctx.log.error({ logEvent: 'searchProjector.failed', err, eventType: event.eventType })
```

`payload` is optional — include only fields needed for tracing, not the full event payload.

**Catalogue (representative):**

```
middleware.requestStarted
commandBus.received
commandBus.stored
commandBus.projectorsComplete
eventStore.appended
eventStore.concurrencyConflict
<aggregate><Action>.handle          e.g. taskCreate.handle
<aggregate><Action>.persisted       e.g. taskCreate.persisted
tasksProjector.projecting
tasksProjector.projected
itemsProjector.projecting
itemsProjector.projected
categoriesProjector.projecting
categoriesProjector.projected
resourcesProjector.projecting
resourcesProjector.projected
balanceProjector.projecting
balanceProjector.projected
dashboardProjector.projecting
dashboardProjector.projected
projectsProjector.projecting
projectsProjector.projected
searchProjector.indexing
searchProjector.indexed
searchProjector.failed
searchIndexer.upserted
searchIndexer.patched
searchIndexer.bootstrapped
```

## Middleware

### `api/middleware/request-context.ts`

```ts
import { randomUUID } from 'crypto';
import { logger } from '../../infrastructure/logger';

// Augment express Request type
declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    log: ILogger;
  }
}

export function requestContextMiddleware(req, _res, next): void {
  req.requestId = randomUUID();
  req.log = logger.child({ requestId: req.requestId });
  next();
}
```

Wire before all routes in `app.ts` / composition root.

### Update `api/middleware/error-handler.ts`

Add `requestId: req.requestId` to the log context on every error.

## Implementation phases

### Phase 1 — Foundation (pure additions, nothing breaks)

- Add `ILogger` port (`application/ports/ILogger.ts`)
- Add `RequestContext` type (`application/ports/RequestContext.ts`)
- Add `requestContextMiddleware` (`api/middleware/request-context.ts`)
- Wire middleware into Express app
- Update error handler to log `requestId`

### Phase 2 — Core pipeline plumbing (atomic)

Must be completed in one pass — interface changes cascade to all handlers and routes.

- Update `ICommandBus`, `ICommandHandler`, `IEventStore`, `IProjector` signatures
- Update `CommandBus` implementation — generate `correlationId`, fork logger, thread `RequestContext`
- Update `EventStore.append()` — accept `ctx`, log `eventStore.appended` on success
- Update all 26 command handlers — accept `ctx`, pass to `append()`, add `logEvent` logs
- Update all route handlers — pass `{ requestId: req.requestId, log: req.log }` to `bus.dispatch()`

### Phase 3 — Read-model projectors

- Update all 7 projectors: tasks, items, categories, resources, balance, dashboard, projects
- Add `logEvent` per-event entry + completion logs

### Phase 4 — Search layer

- Update 3 search projectors: tasks-search, items-search, projects-search
- Align `MeilisearchSearchIndexer` and `bootstrapSearchIndex` to `logEvent` convention

Phases 3 and 4 are independent and can be done in either order.
