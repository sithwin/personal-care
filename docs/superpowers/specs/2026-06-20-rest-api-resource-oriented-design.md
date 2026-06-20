# REST API: Resource-Oriented Routes Design

**Date:** 2026-06-20
**Status:** Approved

## Problem

The current write API exposes internal command type names directly to HTTP clients via a generic `POST /commands/:type` endpoint. This creates three problems:

1. **UUID generation on the client** — `Create*Command` payloads include `id`, requiring the frontend to generate UUIDs.
2. **Internal naming leaked** — clients must know `CreateCategoryCommand` as a URL segment; renaming it is a breaking API change.
3. **No standard contract** — third parties cannot call the API using conventional REST tooling or documentation; they must know the internal command bus vocabulary.

## Goal

Replace the generic command endpoint with resource-oriented REST routes. The public API surface is clean HTTP paths and JSON bodies. Internal command types, handler names, and the CommandBus remain unchanged and invisible to clients.

## HTTP Layer

Each resource router is extended to include write endpoints alongside existing read endpoints. The generic `POST /commands/:type` endpoint is removed.

### Route Table

```
# Categories
POST   /api/v1/categories            → CreateCategoryCommand
PATCH  /api/v1/categories/:id        → UpdateCategoryCommand
DELETE /api/v1/categories/:id        → DeleteCategoryCommand

# Tasks
POST   /api/v1/tasks                 → CreateTaskCommand
PATCH  /api/v1/tasks/:id             → UpdateTaskCommand
POST   /api/v1/tasks/:id/start       → StartTaskCommand
POST   /api/v1/tasks/:id/complete    → CompleteTaskCommand
POST   /api/v1/tasks/:id/schedule    → ScheduleTaskCommand
POST   /api/v1/tasks/:id/recurrence  → SetTaskRecurrenceCommand
POST   /api/v1/tasks/:id/recurrence/skip      → SkipRecurrenceCommand
POST   /api/v1/tasks/:id/promote              → PromoteToProjectCommand
POST   /api/v1/tasks/:id/items/:itemId        → AddItemRequirementCommand
DELETE /api/v1/tasks/:id/items/:itemId        → RemoveItemRequirementCommand
POST   /api/v1/tasks/:id/resources/:resourceId  → AttachResourceToTaskCommand
DELETE /api/v1/tasks/:id/resources/:resourceId  → DetachResourceFromTaskCommand

# Items
POST   /api/v1/items                     → CreateItemCommand
POST   /api/v1/items/:id/available       → MarkItemAvailableCommand
POST   /api/v1/items/:id/consumed        → MarkItemConsumedCommand
POST   /api/v1/items/:id/available-again → MarkItemAvailableAgainCommand

# Projects
POST   /api/v1/projects                   → CreateProjectCommand
PATCH  /api/v1/projects/:id               → UpdateProjectCommand
POST   /api/v1/projects/:id/tasks/:taskId → AddTaskToProjectCommand
POST   /api/v1/projects/:id/complete      → CompleteProjectCommand
POST   /api/v1/projects/:id/plan          → PlanProjectCommand
POST   /api/v1/projects/:id/start         → StartProjectCommand
POST   /api/v1/projects/:id/pause         → PauseProjectCommand
POST   /api/v1/projects/:id/resume        → ResumeProjectCommand

# Resources
POST   /api/v1/resources     → CreateResourceCommand
PATCH  /api/v1/resources/:id → UpdateResourceCommand
DELETE /api/v1/resources/:id → DeleteResourceCommand

# Balance Rules
POST   /api/v1/balance-rules     → CreateBalanceRuleCommand
PATCH  /api/v1/balance-rules/:id → UpdateBalanceRuleCommand
DELETE /api/v1/balance-rules/:id → DeleteBalanceRuleCommand
```

### Route Handler Contract

- **Create routes (`POST /resource`):** validate body with Zod (no `id`), dispatch, return `201 { id: events[0].aggregateId }`.
- **Mutation routes (`PATCH /:id`, action `POST /:id/action`):** validate `req.params.id` as UUID, validate body if present, merge into payload, dispatch, return `204`.
- **Delete / param-only routes:** validate URL params as UUIDs, no body, dispatch, return `204`.
- **Sub-resource routes (`POST /:id/items/:itemId`):** both URL params are validated as UUIDs and merged into the payload — no body. Example: `AddItemRequirementCommand` has `{ taskId, itemId, consumable }` where `consumable` comes from the body and both IDs from the URL.
- **Action routes with body:** `POST /tasks/:id/complete` accepts `{ itemDisposals }` in the body; `POST /tasks/:id/schedule` accepts `{ scheduledDate, scheduledStartTime }`; `POST /tasks/:id/recurrence` accepts `{ recurrenceRule, dueDate? }`; `POST /tasks/:id/promote` accepts `{ projectId }`; `POST /projects/:id/plan` accepts `{ startDate, endDate }`.
- **Action routes with no body:** `POST /tasks/:id/start`, `POST /tasks/:id/recurrence/skip`, `POST /projects/:id/complete`, `POST /projects/:id/start`, `POST /projects/:id/pause`, `POST /projects/:id/resume`, `POST /items/:id/available`, `POST /items/:id/consumed`, `POST /items/:id/available-again` — payload constructed entirely from URL params.
- All handlers use `asyncHandler` — no manual try/catch.

```ts
// Example: POST /api/v1/categories
router.post('/', asyncHandler(async (req, res) => {
  const body = createCategorySchema.parse(req.body);
  const events = await bus.dispatch(
    { type: 'CreateCategoryCommand', payload: body },
    { requestId: req.requestId, log: req.log },
  );
  res.status(201).json({ id: events[0].aggregateId });
}));

// Example: PATCH /api/v1/categories/:id
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = updateCategorySchema.parse(req.body);
  await bus.dispatch(
    { type: 'UpdateCategoryCommand', payload: { id, ...body } },
    { requestId: req.requestId, log: req.log },
  );
  res.status(204).send();
}));
```

### Router Factory Signatures

Each router factory adds `bus: ICommandBus` as a second parameter:

```ts
// Before
function makeCategoriesRouter(queryService: ICategoryQueryService): Router

// After
function makeCategoriesRouter(queryService: ICategoryQueryService, bus: ICommandBus): Router
```

## ID Generation

The aggregate's `static create()` method generates the UUID using `crypto.randomUUID()`. No UUID is accepted from outside the domain layer.

```ts
// Category.ts
static create(cmd: CreateCategoryCommand): CategoryCreated {
  return new CategoryCreated(randomUUID() as UUID, cmd.payload);
}
```

Domain event constructors are updated to take `aggregateId` and `payload` as separate arguments, replacing the previous pattern of destructuring `id` from the command payload:

```ts
// CategoryCreated.ts
constructor(aggregateId: UUID, payload: CreateCategoryCommand['payload']) {
  super('CategoryCreated', aggregateId, 'category', payload as unknown as Record<string, unknown>);
}
```

`reconstruct()` methods already read identity from `event.aggregateId` (fixed in the projector-cleanup commit) so no further changes are needed there.

## Command Interface Changes

`id` is removed from all `Create*Command` payload types. The `type` literal field is retained as the internal CommandBus discriminant — it never appears in the HTTP contract.

```ts
// Before
export interface CreateCategoryCommand {
  readonly type: 'CreateCategoryCommand';
  readonly payload: {
    readonly id: UUID;        // ← removed
    readonly name: string;
    readonly icon: string;
    readonly color: string;
    readonly isDefault: boolean;
  };
}

// After
export interface CreateCategoryCommand {
  readonly type: 'CreateCategoryCommand';
  readonly payload: {
    readonly name: string;
    readonly icon: string;
    readonly color: string;
    readonly isDefault: boolean;
  };
}
```

`Update*Command` and `Delete*Command` keep `id` in their payload — command handlers use it to load the aggregate from the event store.

## Validation Schemas

Zod schemas move from keyed-by-command-type to named exports consumed directly by each resource router. The `id` field is removed from create schemas.

```ts
// api/validation/category-commands.schema.ts
export const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
  isDefault: z.boolean(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});
```

## Deletions

These files are removed entirely:

| File | Reason |
|------|--------|
| `api/routes/commands.router.ts` | Generic endpoint removed |
| `api/routes/commands.router.spec.ts` | No longer needed |
| `api/middleware/validate-command.ts` | Generic type-dispatch middleware removed |
| `api/middleware/validate-command.spec.ts` | No longer needed |
| `api/validation/index.ts` | Merged `commandSchemas` record no longer needed |

## Testing

- **Domain event specs** (`Project.spec.ts`, `Resource.spec.ts`, etc.): constructors now take `(aggregateId, payload)` separately, so tests still pass a known ID (e.g. `'p1'`) as the first argument — the payload assertion just no longer includes `id`.
- **Command handler specs** (`CreateCategoryHandler.spec.ts`, etc.): remove `id` from command payloads; use `vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')` to control the generated ID and still assert the exact event appended.
- **Router specs**: new integration-style tests per resource router covering create (assert `201` + `{ id }` in body), mutation (assert `204`), and validation errors (assert `400`).
- **Deleted middleware/command-router specs** are removed with their source files.
