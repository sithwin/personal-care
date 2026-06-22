# DB Integration Test Improvement — Design Spec

**Date:** 2026-06-21
**Status:** Approved

## Context

The projector specs (`tasks.projector.spec.ts`, `items.projector.spec.ts`) currently test projector logic by connecting to a real PostgreSQL instance. This makes them broad integration tests in Fowler's taxonomy — they require Docker to be running and `fileParallelism: false` in vitest to prevent concurrent `TRUNCATE` collisions.

The goal is to convert these to **narrow integration tests** (Fowler) by replacing the real `Pool` with in-memory repository fakes. Each projector's contract — "given this event, call the right repository method with the right data" — is fully verifiable without SQL.

## Approach

In-memory repository fakes (`Map`-backed implementations of the existing `ITaskViewRepository`, `IItemViewRepository`, `ICategoryViewRepository` interfaces). This is Fowler's **Fake** pattern: a working implementation that takes a shortcut not suitable for production.

## File Structure

```
packages/backend/src/infrastructure/
  __test__/
    repositoryMock/
      InMemoryTaskViewRepository.ts
      InMemoryItemViewRepository.ts
      InMemoryCategoryViewRepository.ts
  projections/
    tasks.projector.spec.ts      ← rewritten (no Pool)
    items.projector.spec.ts      ← rewritten (no Pool)
```

## Mock Internals

### InMemoryTaskViewRepository

Implements `ITaskViewRepository` in full. Internal state:

- `tasks: Map<string, TaskRecord>` — one entry per `insert()` call, mutated by subsequent commands
- `taskItems: Map<string, TaskItemRecord[]>` — keyed by `taskId`, mutated by `insertItemRequirement` / `deleteItemRequirement` / `updateItemStatusForItem`

Extra read methods (not on the interface — for test assertions only):

```ts
getTask(id: string): TaskRecord | undefined
getTaskStatus(id: string): string | undefined
getTaskItems(taskId: string): TaskItemRecord[]
```

`TaskRecord` is a plain object mirroring the shape of `tasks_view` columns. The `status` field starts as `'ready'` on `insert` (matching the real repo's SQL default) and is mutated by `markStarted`, `markCompleted`, `updateStatus`, `reschedule`, etc.

### InMemoryItemViewRepository

Implements `IItemViewRepository`. Internal state:

- `items: Map<string, { id: string; status: string }>` — mutated by `insert` and `updateStatus`

Extra read method:

```ts
getItem(id: string): { id: string; status: string } | undefined
```

### InMemoryCategoryViewRepository

Implements `ICategoryViewRepository`. Internal state:

- `categories: Map<string, InsertCategoryData>`

No extra read methods needed — categories are seed data in tests, not the subject of assertions.

## How Projector Specs Change

`beforeAll` / `afterAll` pool management is removed entirely. `beforeEach` creates fresh mock instances and seeds a category directly via the mock:

```ts
beforeEach(async () => {
  taskRepo = new InMemoryTaskViewRepository();
  itemRepo = new InMemoryItemViewRepository();
  categoryRepo = new InMemoryCategoryViewRepository();
  await categoryRepo.insert({ id: CAT_ID, name: 'Cars', icon: '🚗', color: '#3b82f6', isDefault: false });
  tasksProjector = createTasksProjector(taskRepo, itemRepo);
});
```

Assertions shift from raw SQL queries to the mock's read methods:

```ts
// before
const row = await pool.query('SELECT status FROM tasks_view WHERE id = $1', [TASK_ID]);
expect(row.rows[0].status).toBe('ongoing');

// after
expect(taskRepo.getTaskStatus(TASK_ID)).toBe('ongoing');
```

## Deleted Files

The existing real-DB projector specs are deleted:

- `packages/backend/src/infrastructure/projections/tasks.projector.spec.ts` (replaced by the rewritten version)
- `packages/backend/src/infrastructure/projections/items.projector.spec.ts` (replaced by the rewritten version)

The SQL correctness of `PgTaskViewRepository` and `PgItemViewRepository` is not covered in this change. That is a separate concern — dedicated `Pg*ViewRepository.spec.ts` tests are out of scope here.

## vitest Config Change

`fileParallelism: false` in `vitest.config.ts` was required to prevent concurrent DB specs from colliding on `TRUNCATE`. With no real-DB specs remaining in the default suite, this can be set to `true`, giving a free speed boost to the full `npm test` run.

## Out of Scope

- Repository SQL tests (`PgTaskViewRepository`, `PgItemViewRepository`) — future work
- Search projector specs — already narrow (mock `ISearchIndexer` via `vi.fn()`)
- End-to-end HTTP tests
