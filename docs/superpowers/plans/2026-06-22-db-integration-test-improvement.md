# DB Integration Test Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace real-PostgreSQL projector specs with narrow integration tests backed by in-memory repository fakes, eliminating the Docker dependency and enabling parallel test execution.

**Architecture:** Three `Map`-backed fakes implement the existing repository interfaces (`ITaskViewRepository`, `IItemViewRepository`, `ICategoryViewRepository`). The projector specs are rewritten to construct fresh fakes in `beforeEach`, seed data through the fakes directly, and assert via extra read-only methods added to the fakes for test use only. No production code changes.

**Tech Stack:** TypeScript 5, vitest 1.x, Node.js 20 — no new dependencies.

## Global Constraints

- All files in `packages/backend/src/`
- No `any` types — use `unknown` with type guards at boundaries
- Named exports only — no `export default`
- `import type` for type-only imports
- Test files use `.spec.ts` extension; co-located with source
- Do not touch any production code (projectors, domain, application layers)

---

### Task 1: Create InMemoryTaskViewRepository

**Files:**
- Create: `packages/backend/src/infrastructure/__test__/repositoryMock/InMemoryTaskViewRepository.ts`

**Interfaces:**
- Implements: `ITaskViewRepository` from `packages/backend/src/application/ports/ITaskViewRepository.ts`
- Produces: `InMemoryTaskViewRepository` class with extra read methods `getTask(id)`, `getTaskStatus(id)`, `getTaskItems(taskId)` used by projector specs

- [x] **Step 1: Create the file**

```ts
import type {
  ITaskViewRepository,
  InsertTaskData,
  TaskViewRow,
  UpdateTaskData,
} from '../../../application/ports/ITaskViewRepository';

interface TaskRecord {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  projectId: string | null;
  dueDate: string | null;
  estimatedDurationValue: number | null;
  estimatedDurationUnit: string | null;
  scheduledDate: string | null;
  scheduledStartTime: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  recurrenceRule: unknown | null;
  status: string;
  completionCount: number;
}

interface TaskItemRecord {
  taskId: string;
  itemId: string;
  consumable: boolean;
  itemStatus: string;
}

export class InMemoryTaskViewRepository implements ITaskViewRepository {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly taskItems = new Map<string, TaskItemRecord[]>();

  async insert(data: InsertTaskData): Promise<void> {
    this.tasks.set(data.id, {
      id: data.id,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      projectId: data.projectId,
      dueDate: data.dueDate,
      estimatedDurationValue: data.estimatedDurationValue,
      estimatedDurationUnit: data.estimatedDurationUnit,
      scheduledDate: null,
      scheduledStartTime: null,
      startedAt: null,
      completedAt: null,
      recurrenceRule: null,
      status: 'ready',
      completionCount: 0,
    });
  }

  async markStarted(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) task.startedAt = new Date();
  }

  async markCompleted(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) task.completedAt = new Date();
  }

  async reschedule(id: string, nextDueDate: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.startedAt = null;
    task.completedAt = null;
    task.dueDate = nextDueDate;
    task.completionCount += 1;
  }

  async setSchedule(id: string, scheduledDate: string, scheduledStartTime: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.scheduledDate = scheduledDate;
    task.scheduledStartTime = scheduledStartTime;
  }

  async setRecurrence(id: string, recurrenceRule: unknown, dueDate: string | null): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.recurrenceRule = recurrenceRule;
    if (dueDate !== null) task.dueDate = dueDate;
  }

  async setDueDate(id: string, dueDate: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) task.dueDate = dueDate;
  }

  async setProjectId(id: string, projectId: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) task.projectId = projectId;
  }

  async updateFields(id: string, data: UpdateTaskData): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    if (data.name !== null) task.name = data.name;
    if (data.categoryId !== null) task.categoryId = data.categoryId;
    if (data.description !== null) task.description = data.description;
    if (data.estimatedDurationValue !== null) task.estimatedDurationValue = data.estimatedDurationValue;
    if (data.estimatedDurationUnit !== null) task.estimatedDurationUnit = data.estimatedDurationUnit;
    if (data.dueDate !== null) task.dueDate = data.dueDate;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) task.status = status;
  }

  async findById(id: string): Promise<TaskViewRow | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      recurrenceRule: task.recurrenceRule,
    };
  }

  async getItemStatusesForTask(taskId: string): Promise<string[]> {
    return (this.taskItems.get(taskId) ?? []).map(r => r.itemStatus);
  }

  async insertItemRequirement(taskId: string, itemId: string, consumable: boolean, itemStatus: string): Promise<void> {
    const items = this.taskItems.get(taskId) ?? [];
    if (!items.some(r => r.itemId === itemId)) {
      items.push({ taskId, itemId, consumable, itemStatus });
      this.taskItems.set(taskId, items);
    }
  }

  async deleteItemRequirement(taskId: string, itemId: string): Promise<void> {
    const items = this.taskItems.get(taskId) ?? [];
    this.taskItems.set(taskId, items.filter(r => r.itemId !== itemId));
  }

  async updateItemStatusForItem(itemId: string, status: string): Promise<void> {
    for (const items of this.taskItems.values()) {
      for (const record of items) {
        if (record.itemId === itemId) record.itemStatus = status;
      }
    }
  }

  async getTaskIdsForItem(itemId: string): Promise<string[]> {
    const taskIds: string[] = [];
    for (const [taskId, items] of this.taskItems.entries()) {
      if (items.some(r => r.itemId === itemId)) taskIds.push(taskId);
    }
    return taskIds;
  }

  // Test-only read methods
  getTask(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  getTaskStatus(id: string): string | undefined {
    return this.tasks.get(id)?.status;
  }

  getTaskItems(taskId: string): TaskItemRecord[] {
    return this.taskItems.get(taskId) ?? [];
  }
}
```

- [x] **Step 2: Verify it compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: zero errors

---

### Task 2: Create InMemoryItemViewRepository

**Files:**
- Create: `packages/backend/src/infrastructure/__test__/repositoryMock/InMemoryItemViewRepository.ts`

**Interfaces:**
- Implements: `IItemViewRepository` from `packages/backend/src/application/ports/IItemViewRepository.ts`
- Produces: `InMemoryItemViewRepository` class with extra read method `getItem(id)`

- [x] **Step 1: Create the file**

```ts
import type { IItemViewRepository, InsertItemData } from '../../../application/ports/IItemViewRepository';

interface ItemRecord {
  id: string;
  status: string;
}

export class InMemoryItemViewRepository implements IItemViewRepository {
  private readonly items = new Map<string, ItemRecord>();

  async insert(data: InsertItemData): Promise<void> {
    this.items.set(data.id, { id: data.id, status: 'to_buy' });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const item = this.items.get(id);
    if (item) item.status = status;
  }

  async findStatus(id: string): Promise<string | null> {
    return this.items.get(id)?.status ?? null;
  }

  // Test-only read method
  getItem(id: string): ItemRecord | undefined {
    return this.items.get(id);
  }
}
```

- [x] **Step 2: Verify it compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: zero errors

---

### Task 3: Create InMemoryCategoryViewRepository

**Files:**
- Create: `packages/backend/src/infrastructure/__test__/repositoryMock/InMemoryCategoryViewRepository.ts`

**Interfaces:**
- Implements: `ICategoryViewRepository` from `packages/backend/src/application/ports/ICategoryViewRepository.ts`
- Produces: `InMemoryCategoryViewRepository` class used only to seed category data in projector specs

- [x] **Step 1: Create the file**

```ts
import type {
  ICategoryViewRepository,
  InsertCategoryData,
  UpdateCategoryData,
} from '../../../application/ports/ICategoryViewRepository';

interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export class InMemoryCategoryViewRepository implements ICategoryViewRepository {
  private readonly categories = new Map<string, CategoryRecord>();

  async insert(data: InsertCategoryData): Promise<void> {
    this.categories.set(data.id, { ...data });
  }

  async update(id: string, data: UpdateCategoryData): Promise<void> {
    const cat = this.categories.get(id);
    if (!cat) return;
    if (data.name !== null) cat.name = data.name;
    if (data.icon !== null) cat.icon = data.icon;
    if (data.color !== null) cat.color = data.color;
  }

  async markDeleted(id: string): Promise<void> {
    this.categories.delete(id);
  }

  async incrementTaskCount(_categoryId: string): Promise<void> {}

  async incrementItemCount(_categoryId: string): Promise<void> {}
}
```

- [x] **Step 2: Verify it compiles**

Run: `cd packages/backend && npx tsc --noEmit`
Expected: zero errors

- [x] **Step 3: Commit the three fakes**

```bash
git add packages/backend/src/infrastructure/__test__/repositoryMock/
git commit -m "test(projections): add in-memory repository fakes for projector specs"
```

---

### Task 4: Rewrite tasks.projector.spec.ts

**Files:**
- Modify: `packages/backend/src/infrastructure/projections/tasks.projector.spec.ts`

**Interfaces:**
- Consumes: `InMemoryTaskViewRepository`, `InMemoryItemViewRepository`, `InMemoryCategoryViewRepository` from Task 1–3
- Consumes: `createTasksProjector` from `./tasks.projector`

- [x] **Step 1: Replace the file**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTasksProjector } from './tasks.projector';
import { InMemoryTaskViewRepository } from '../__test__/repositoryMock/InMemoryTaskViewRepository';
import { InMemoryItemViewRepository } from '../__test__/repositoryMock/InMemoryItemViewRepository';
import { InMemoryCategoryViewRepository } from '../__test__/repositoryMock/InMemoryCategoryViewRepository';

const CAT_ID  = '00000000-0000-0000-0000-000000000001';
const TASK_ID = '00000000-0000-0000-0000-000000000002';
const ITEM_ID = '00000000-0000-0000-0000-000000000003';

let taskRepo: InMemoryTaskViewRepository;
let itemRepo: InMemoryItemViewRepository;
let tasksProjector: ReturnType<typeof createTasksProjector>;

beforeEach(async () => {
  taskRepo = new InMemoryTaskViewRepository();
  itemRepo = new InMemoryItemViewRepository();
  const categoryRepo = new InMemoryCategoryViewRepository();
  await categoryRepo.insert({ id: CAT_ID, name: 'Cars', icon: '🚗', color: '#3b82f6', isDefault: false });
  tasksProjector = createTasksProjector(taskRepo, itemRepo);
});

describe('Tasks projector', () => {
  it('TaskCreated inserts task with status ready', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    expect(taskRepo.getTask(TASK_ID)?.name).toBe('Oil change');
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('ready');
  });

  it('TaskStarted sets status to ongoing', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskStarted', payload: { id: TASK_ID }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('ongoing');
  });

  it('TaskCompleted sets status to done for non-recurring', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: TASK_ID, itemDisposals: [] }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('done');
  });

  it('TaskRescheduled resets task to planned with new due date', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: TASK_ID, itemDisposals: [] }, version: 2, createdAt: new Date() });
    const nextDueDate = new Date('2027-06-14').toISOString();
    await tasksProjector({ id: 3, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskRescheduled', payload: { id: TASK_ID, nextDueDate }, version: 3, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('planned');
    expect(taskRepo.getTask(TASK_ID)?.completionCount).toBe(1);
  });

  it('ItemRequirementAdded inserts into task_items_view and sets task to pending', async () => {
    await itemRepo.insert({ id: ITEM_ID, name: 'Solar light', description: null, categoryId: CAT_ID, quantity: null, price: null, notes: null });
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Set up solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: TASK_ID, itemId: ITEM_ID, consumable: true }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('pending');
  });
});
```

- [x] **Step 2: Run the tasks projector spec**

Run: `cd packages/backend && npx vitest run --reporter=verbose src/infrastructure/projections/tasks.projector.spec.ts`
Expected: 4 tests pass, 0 fail

- [x] **Step 3: Commit**

```bash
git add packages/backend/src/infrastructure/projections/tasks.projector.spec.ts
git commit -m "test(projections): rewrite tasks projector spec to use in-memory fakes"
```

---

### Task 5: Rewrite items.projector.spec.ts

**Files:**
- Modify: `packages/backend/src/infrastructure/projections/items.projector.spec.ts`

**Interfaces:**
- Consumes: `InMemoryTaskViewRepository`, `InMemoryItemViewRepository`, `InMemoryCategoryViewRepository` from Tasks 1–3
- Consumes: `createItemsProjector` from `./items.projector`, `createTasksProjector` from `./tasks.projector`

- [x] **Step 1: Replace the file**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createItemsProjector } from './items.projector';
import { createTasksProjector } from './tasks.projector';
import { InMemoryTaskViewRepository } from '../__test__/repositoryMock/InMemoryTaskViewRepository';
import { InMemoryItemViewRepository } from '../__test__/repositoryMock/InMemoryItemViewRepository';
import { InMemoryCategoryViewRepository } from '../__test__/repositoryMock/InMemoryCategoryViewRepository';

const CAT_ID  = '00000000-0000-0000-0000-000000000001';
const TASK_ID = '00000000-0000-0000-0000-000000000002';
const ITEM_ID = '00000000-0000-0000-0000-000000000003';

let taskRepo: InMemoryTaskViewRepository;
let itemRepo: InMemoryItemViewRepository;
let itemsProjector: ReturnType<typeof createItemsProjector>;
let tasksProjector: ReturnType<typeof createTasksProjector>;

beforeEach(async () => {
  taskRepo = new InMemoryTaskViewRepository();
  itemRepo = new InMemoryItemViewRepository();
  const categoryRepo = new InMemoryCategoryViewRepository();
  await categoryRepo.insert({ id: CAT_ID, name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false });
  itemsProjector = createItemsProjector(itemRepo, taskRepo);
  tasksProjector = createTasksProjector(taskRepo, itemRepo);
});

describe('Items projector', () => {
  it('ItemCreated inserts item with status to_buy', async () => {
    await itemsProjector({ id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemCreated', payload: { id: ITEM_ID, name: 'Solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    expect(itemRepo.getItem(ITEM_ID)?.status).toBe('to_buy');
  });

  it('MarkItemAvailable updates item and unblocks tasks', async () => {
    await itemsProjector({ id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemCreated', payload: { id: ITEM_ID, name: 'Solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Set up solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 3, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: TASK_ID, itemId: ITEM_ID, consumable: true }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('pending');
    await itemsProjector({ id: 4, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemMarkedAvailable', payload: { id: ITEM_ID }, version: 2, createdAt: new Date() });
    expect(taskRepo.getTaskStatus(TASK_ID)).toBe('ready');
  });
});
```

- [x] **Step 2: Run the items projector spec**

Run: `cd packages/backend && npx vitest run --reporter=verbose src/infrastructure/projections/items.projector.spec.ts`
Expected: 2 tests pass, 0 fail

- [x] **Step 3: Commit**

```bash
git add packages/backend/src/infrastructure/projections/items.projector.spec.ts
git commit -m "test(projections): rewrite items projector spec to use in-memory fakes"
```

---

### Task 6: Enable parallel test execution

**Files:**
- Modify: `packages/backend/vitest.config.ts`

**Interfaces:**
- No new interfaces

- [x] **Step 1: Update vitest config**

Change `fileParallelism: false` to `fileParallelism: true` in `packages/backend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: true,
    restoreMocks: true,
    include: ['src/**/*.spec.ts'],
  },
});
```

- [x] **Step 2: Run the full backend test suite**

Run: `npm test --workspace=@personal-care/backend`
Expected: all tests pass (the two rewritten projector specs plus all other specs)

- [x] **Step 3: Commit**

```bash
git add packages/backend/vitest.config.ts
git commit -m "chore(test): enable fileParallelism now that no real-DB projector specs remain"
```

---

## Completion Summary

**Date completed:** 2026-06-22

**Total tasks:** 6

**Commits (38e7437→b486176):**
1. `9ee6dfd` test(fakes): create InMemoryTaskViewRepository fake for projector integration tests
2. `869e015` fix(fakes): fix deleteItemRequirement map pollution and standardise nil-handling
3. `bcbb6c4` feat(test): create InMemoryItemViewRepository fake for integration tests
4. `2dd251f` test(projections): add in-memory repository fakes for projector specs
5. `41e1f78` test(projections): rewrite tasks projector spec to use in-memory fakes
6. `9410316` test(projections): rewrite items projector spec to use in-memory fakes
7. `e06de58` chore(test): enable fileParallelism now that no real-DB projector specs remain
8. `b486176` test(projections): add dueDate assertion and insert idempotency guard

**Total tests:** 264 backend tests passing with `fileParallelism: true`

**Deviations from plan:**
- Tasks 1 and 2 each committed separately before Task 3's bundled commit; all three fakes are present and correct.
- Two fixes added beyond the plan: (a) `deleteItemRequirement` map-pollution guard (reviewer finding), (b) `insert` idempotency guard and explicit `dueDate` assertion in `TaskRescheduled` test (final review findings).
