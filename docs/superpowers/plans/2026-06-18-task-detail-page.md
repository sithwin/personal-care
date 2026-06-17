# Task Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `RemoveItemRequirementCommand` to the backend and a dedicated `TaskDetail` page at `/tasks/:id` to the frontend, replacing the inline edit form in `TaskRow`.

**Architecture:** Backend follows the existing event-sourced pattern — new command/event/handler/projector case mirrors `DetachResourceFromTaskCommand` exactly. Frontend is a new single-file page component using existing hooks and dispatch patterns; navigation changes are minimal edits to three existing files.

**Tech Stack:** Node.js 20, TypeScript 5, PostgreSQL 16, Express, pg, vitest (backend); React 18, Vite, Tailwind CSS, TanStack Query, react-router-dom v6 (frontend)

## Global Constraints

- Named exports only — never `export default`
- `import type` for type-only imports
- `const` by default, `let` only when reassignment needed
- Never `any` — use `unknown` with type guards at boundaries
- No inline try/catch in route handlers — use `asyncHandler`
- No raw SQL outside repository implementations
- Domain aggregates must not import from `pg`, `express`, or any framework
- Dependencies only point inward (domain ← application ← infrastructure)
- Test files use `.spec.ts` extension, co-located with source

---

### Task 1: Backend — `RemoveItemRequirementCommand`

**Files:**
- Create: `packages/backend/src/domain/task/commands/RemoveItemRequirementCommand.ts`
- Create: `packages/backend/src/domain/task/events/ItemRequirementRemoved.ts`
- Create: `packages/backend/src/application/command-handlers/task/RemoveItemRequirementHandler.ts`
- Create: `packages/backend/src/application/command-handlers/task/RemoveItemRequirementHandler.spec.ts`
- Modify: `packages/backend/src/domain/task/Task.ts`
- Modify: `packages/backend/src/domain/task/commands/index.ts`
- Modify: `packages/backend/src/application/ports/ITaskViewRepository.ts`
- Modify: `packages/backend/src/infrastructure/persistence/views/PgTaskViewRepository.ts`
- Modify: `packages/backend/src/infrastructure/projections/tasks.projector.ts`
- Modify: `packages/backend/src/api/validation/task-commands.schema.ts`
- Modify: `packages/backend/src/infrastructure/composition-root.ts`

**Interfaces:**
- Produces:
  - `RemoveItemRequirementCommand` — `{ type: 'RemoveItemRequirementCommand'; payload: { taskId: UUID; itemId: UUID } }`
  - `ItemRequirementRemoved` — domain event extending `DomainEvent`, event type `'ItemRequirementRemoved'`
  - `ITaskViewRepository.deleteItemRequirement(taskId: string, itemId: string): Promise<void>`
  - Command registered as `'RemoveItemRequirementCommand'` in `CommandBus`

- [ ] **Step 1: Write the failing spec**

Create `packages/backend/src/application/command-handlers/task/RemoveItemRequirementHandler.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { RemoveItemRequirementHandler } from './RemoveItemRequirementHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { RemoveItemRequirementCommand } from '../../../domain/task/commands/RemoveItemRequirementCommand';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'task-1',
    aggregateType: 'task',
    eventType: 'TaskCreated',
    payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('RemoveItemRequirementHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: RemoveItemRequirementCommand = {
      type: 'RemoveItemRequirementCommand',
      payload: { taskId: 'task-1', itemId: 'item-1' },
    };
    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    await expect(new RemoveItemRequirementHandler(mockEventStore).handle(cmd))
      .rejects.toThrow('Task not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends ItemRequirementRemoved with expectedVersion equal to history.length', async () => {
    const cmd: RemoveItemRequirementCommand = {
      type: 'RemoveItemRequirementCommand',
      payload: { taskId: 'task-1', itemId: 'item-1' },
    };
    const history = [makeCreatedEvent()];
    const mockStoredEvents: StoredEvent[] = [{
      id: 2, aggregateId: 'task-1', aggregateType: 'task',
      eventType: 'ItemRequirementRemoved',
      payload: { taskId: 'task-1', itemId: 'item-1' },
      version: 2, createdAt: new Date(),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const result = await new RemoveItemRequirementHandler(mockEventStore).handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('task-1');
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('ItemRequirementRemoved');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });
});
```

- [ ] **Step 2: Run spec to confirm it fails**

```bash
cd packages/backend && npx vitest run src/application/command-handlers/task/RemoveItemRequirementHandler.spec.ts
```
Expected: FAIL — `Cannot find module './RemoveItemRequirementHandler'`

- [ ] **Step 3: Create the command interface**

Create `packages/backend/src/domain/task/commands/RemoveItemRequirementCommand.ts`:

```ts
import type { UUID } from '../../../types';

export interface RemoveItemRequirementCommand {
  readonly type: 'RemoveItemRequirementCommand';
  readonly payload: { readonly taskId: UUID; readonly itemId: UUID };
}
```

- [ ] **Step 4: Create the domain event**

Create `packages/backend/src/domain/task/events/ItemRequirementRemoved.ts`:

```ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { RemoveItemRequirementCommand } from '../commands/RemoveItemRequirementCommand';

export class ItemRequirementRemoved extends DomainEvent {
  constructor(readonly payload: RemoveItemRequirementCommand['payload']) {
    super('ItemRequirementRemoved', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
```

- [ ] **Step 5: Add `removeItemRequirement` to the Task aggregate**

In `packages/backend/src/domain/task/Task.ts`, add the import and method adjacent to `addItemRequirement`.

Add import (after the `ItemRequirementAdded` import line):
```ts
import { ItemRequirementRemoved } from './events/ItemRequirementRemoved';
```

Add import for command (after the `AddItemRequirementCommand` import in the commands import block):
```ts
import type { RemoveItemRequirementCommand } from './commands/RemoveItemRequirementCommand';
```

Add method adjacent to `addItemRequirement`:
```ts
removeItemRequirement(cmd: RemoveItemRequirementCommand): ItemRequirementRemoved {
  return new ItemRequirementRemoved(cmd.payload);
}
```

- [ ] **Step 6: Create the handler**

Create `packages/backend/src/application/command-handlers/task/RemoveItemRequirementHandler.ts`:

```ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { RemoveItemRequirementCommand } from '../../../domain/task/commands/RemoveItemRequirementCommand';
import { Task } from '../../../domain/task/Task';

export class RemoveItemRequirementHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: RemoveItemRequirementCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.removeItemRequirement(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [ ] **Step 7: Run spec to confirm it passes**

```bash
cd packages/backend && npx vitest run src/application/command-handlers/task/RemoveItemRequirementHandler.spec.ts
```
Expected: PASS — 2 tests

- [ ] **Step 8: Add command to the union type**

In `packages/backend/src/domain/task/commands/index.ts`, add:

```ts
export type { RemoveItemRequirementCommand } from './RemoveItemRequirementCommand';
```
(in the top export block)

```ts
import type { RemoveItemRequirementCommand } from './RemoveItemRequirementCommand';
```
(in the import block)

Add `| RemoveItemRequirementCommand` to the `TaskCommand` union.

- [ ] **Step 9: Add `deleteItemRequirement` to the repository interface**

In `packages/backend/src/application/ports/ITaskViewRepository.ts`, add inside the `ITaskViewRepository` interface:

```ts
deleteItemRequirement(taskId: string, itemId: string): Promise<void>;
```

- [ ] **Step 10: Implement `deleteItemRequirement` in the Postgres repository**

In `packages/backend/src/infrastructure/persistence/views/PgTaskViewRepository.ts`, add the method after `insertItemRequirement`:

```ts
async deleteItemRequirement(taskId: string, itemId: string): Promise<void> {
  await this.pool.query(
    'DELETE FROM task_items_view WHERE task_id = $1 AND item_id = $2',
    [taskId, itemId]
  );
}
```

- [ ] **Step 11: Handle `ItemRequirementRemoved` in the tasks projector**

In `packages/backend/src/infrastructure/projections/tasks.projector.ts`, add a case inside the `switch` after the `ItemRequirementAdded` case:

```ts
case 'ItemRequirementRemoved':
  await taskRepo.deleteItemRequirement(p.taskId as string, p.itemId as string);
  await refreshTaskStatus(p.taskId as string, taskRepo);
  break;
```

- [ ] **Step 12: Add the Zod validation schema**

In `packages/backend/src/api/validation/task-commands.schema.ts`, add inside `taskCommandSchemas` after `AddItemRequirementCommand`:

```ts
RemoveItemRequirementCommand: z.object({
  taskId: z.string().uuid(),
  itemId: z.string().uuid(),
}),
```

- [ ] **Step 13: Register the handler in the composition root**

In `packages/backend/src/infrastructure/composition-root.ts`:

Add import after `AddItemRequirementHandler` import:
```ts
import { RemoveItemRequirementHandler } from '../application/command-handlers/task/RemoveItemRequirementHandler';
```

Add registration after `AddItemRequirementCommand` line:
```ts
commandBus.register('RemoveItemRequirementCommand', new RemoveItemRequirementHandler(eventStore));
```

- [ ] **Step 14: Run the full backend test suite**

```bash
cd packages/backend && npx vitest run
```
Expected: all tests pass (currently 207; now 209 with the 2 new handler tests)

- [ ] **Step 15: Commit**

```bash
git add packages/backend/src/domain/task/commands/RemoveItemRequirementCommand.ts \
        packages/backend/src/domain/task/events/ItemRequirementRemoved.ts \
        packages/backend/src/application/command-handlers/task/RemoveItemRequirementHandler.ts \
        packages/backend/src/application/command-handlers/task/RemoveItemRequirementHandler.spec.ts \
        packages/backend/src/domain/task/Task.ts \
        packages/backend/src/domain/task/commands/index.ts \
        packages/backend/src/application/ports/ITaskViewRepository.ts \
        packages/backend/src/infrastructure/persistence/views/PgTaskViewRepository.ts \
        packages/backend/src/infrastructure/projections/tasks.projector.ts \
        packages/backend/src/api/validation/task-commands.schema.ts \
        packages/backend/src/infrastructure/composition-root.ts
git commit -m "feat(backend): add RemoveItemRequirementCommand"
```

---

### Task 2: Frontend — `TaskDetail` page

**Files:**
- Create: `packages/frontend/src/pages/TaskDetail.tsx`

**Interfaces:**
- Consumes (from Task 1): `dispatch('RemoveItemRequirementCommand', { taskId, itemId })` — backend now accepts this command
- Consumes (existing): `useTask(id)`, `useCategories()`, `useProjects()`, `useItems()`, `useResources()`, `dispatch`, `useQueryClient`, `useParams`, `Link`, `useNavigate` from react-router-dom, `v4 as uuidv4`
- Produces: `export function TaskDetail()` — mounted at `/tasks/:id` by Task 3

- [ ] **Step 1: Create `TaskDetail.tsx`**

Create `packages/frontend/src/pages/TaskDetail.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '../api/queries';
import { useTask, useCategories, useProjects, useItems, useResources } from '../api/queries';
import { dispatch } from '../api/commands';

const ITEM_STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  to_buy:    { label: 'To Buy',    emoji: '🛒', color: 'bg-yellow-900/40 text-yellow-300' },
  available: { label: 'Available', emoji: '✅', color: 'bg-green-900/40 text-green-300'  },
  consumed:  { label: 'Consumed',  emoji: '📦', color: 'bg-gray-700 text-gray-400'       },
};

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: task, isLoading } = useTask(id!);
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day'>('hour');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setDescription(task.description ?? '');
    setCategoryId(task.category_id);
    setProjectId(task.project_id ?? '');
    setDurationValue(String(task.estimated_duration_value ?? ''));
    setDurationUnit((task.estimated_duration_unit as 'hour' | 'day') ?? 'hour');
    setDueDate(task.due_date?.slice(0, 10) ?? '');
  }, [task]);

  if (isLoading) return <div className="text-gray-500 text-sm">Loading...</div>;
  if (!task) return <div className="text-gray-500 text-sm">Task not found.</div>;

  const handleSave = async () => {
    if (projectId && projectId !== task.project_id) {
      await dispatch('AddTaskToProjectCommand', { projectId, taskId: task.id });
    }
    await dispatch('UpdateTaskCommand', {
      id: task.id,
      name: name.trim() || undefined,
      categoryId: categoryId || undefined,
      description: description || undefined,
      estimatedDuration: durationValue ? { value: Number(durationValue), unit: durationUnit } : undefined,
      dueDate: dueDate || undefined,
    });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTaskCommand', { id: task.id });
    await qc.invalidateQueries();
  };

  const handleComplete = async () => {
    await dispatch('CompleteTaskCommand', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleRemoveItem = async (itemId: string) => {
    await dispatch('RemoveItemRequirementCommand', { taskId: task.id, itemId });
    await qc.invalidateQueries();
  };

  const handleAddItem = async (itemId: string) => {
    await dispatch('AddItemRequirementCommand', { taskId: task.id, itemId, consumable: true });
    await qc.invalidateQueries();
  };

  const handleAddResource = async (resourceId: string) => {
    await dispatch('AttachResourceToTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const handleRemoveResource = async (resourceId: string) => {
    await dispatch('DetachResourceFromTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const attachedItemIds = new Set((task.required_items ?? []).map(i => i.item_id));
  const attachedResourceIds = new Set((task.resources ?? []).map(r => r.resource_id));
  const unattachedItems = (allItems ?? []).filter(i => !attachedItemIds.has(i.id));
  const unattachedResources = (allResources ?? []).filter(r => !attachedResourceIds.has(r.id));

  return (
    <div className="max-w-2xl flex flex-col gap-6">

      <div className="flex items-center gap-3">
        <Link to="/tasks" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Tasks</Link>
      </div>

      {/* Status actions */}
      {(task.status === 'ready' || task.status === 'ongoing') && (
        <div className="flex gap-2">
          {task.status === 'ready' && (
            <button type="button" onClick={handleStart}
              className="px-3 py-1.5 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600">
              Start
            </button>
          )}
          {task.status === 'ongoing' && (
            <button type="button" onClick={handleComplete}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">
              Complete
            </button>
          )}
        </div>
      )}

      {/* Editable fields */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Details</h2>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name..."
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />

        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)" rows={3}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500 resize-none" />

        <div className="flex gap-2">
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">No project</option>
            {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <input type="number" value={durationValue} onChange={e => setDurationValue(e.target.value)}
            placeholder="Duration" min={1}
            className="w-24 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700" />
          <select value={durationUnit} onChange={e => setDurationUnit(e.target.value as 'hour' | 'day')}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            <option value="hour">hour</option>
            <option value="day">day</option>
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700" />
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
            Save
          </button>
        </div>
      </div>

      {/* Items section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Items Required</h2>

        {(task.required_items ?? []).length === 0 && (
          <p className="text-sm text-gray-600">No items required.</p>
        )}

        {(task.required_items ?? []).map(ti => {
          const item = allItems?.find(i => i.id === ti.item_id);
          const cfg = ITEM_STATUS_CONFIG[ti.item_status] ?? ITEM_STATUS_CONFIG.to_buy!;
          return (
            <div key={ti.item_id} className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                {cfg.emoji} {cfg.label}
              </span>
              <span className="flex-1 text-sm text-white">{item?.name ?? ti.item_id}</span>
              <button type="button" onClick={() => handleRemoveItem(ti.item_id)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        {unattachedItems.length > 0 && (
          <select defaultValue=""
            onChange={e => { if (e.target.value) { handleAddItem(e.target.value); e.currentTarget.value = ''; } }}
            className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">+ Add item…</option>
            {unattachedItems.map(i => {
              const cfg = ITEM_STATUS_CONFIG[i.status] ?? ITEM_STATUS_CONFIG.to_buy!;
              return <option key={i.id} value={i.id}>{cfg.emoji} {i.name}</option>;
            })}
          </select>
        )}
      </div>

      {/* Resources section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Resources</h2>

        {(task.resources ?? []).length === 0 && (
          <p className="text-sm text-gray-600">No resources attached.</p>
        )}

        {(task.resources ?? []).map(r => (
          <div key={r.resource_id} className="flex items-center gap-2">
            <span className="flex-1 text-sm text-white">{r.title}</span>
            <button type="button" onClick={() => handleRemoveResource(r.resource_id)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
          </div>
        ))}

        {unattachedResources.length > 0 && (
          <select defaultValue=""
            onChange={e => { if (e.target.value) { handleAddResource(e.target.value); e.currentTarget.value = ''; } }}
            className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">+ Add resource…</option>
            {unattachedResources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        )}
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/pages/TaskDetail.tsx
git commit -m "feat(frontend): add TaskDetail page at /tasks/:id"
```

---

### Task 3: Frontend — Navigation wiring

**Files:**
- Modify: `packages/frontend/src/App.tsx`
- Modify: `packages/frontend/src/pages/Tasks.tsx`
- Modify: `packages/frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes (from Task 2): `TaskDetail` exported from `../pages/TaskDetail`
- Produces: `/tasks/:id` route live; `TaskRow` Edit navigates to detail page; `UpNextRow` task name links to detail page

- [ ] **Step 1: Add the route to `App.tsx`**

In `packages/frontend/src/App.tsx`:

Add import after the `Tasks` import:
```tsx
import { TaskDetail } from './pages/TaskDetail';
```

Add route inside `<Routes>` immediately after the `/tasks` route:
```tsx
<Route path="/tasks/:id" element={<TaskDetail />} />
```

Full file after changes:
```tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { TaskDetail } from './pages/TaskDetail';
import { Items } from './pages/Items';
import { Calendar } from './pages/Calendar';
import { Suggest } from './pages/Suggest';
import { Resources } from './pages/Resources';
import { BalanceRules } from './pages/BalanceRules';
import { Categories } from './pages/Categories';

export function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
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
  );
}
```

- [ ] **Step 2: Replace inline edit in `TaskRow` with a Link**

In `packages/frontend/src/pages/Tasks.tsx`, the `TaskRow` component currently has:
- `editing` state, `handleSave`, `handleCancel`, all the field states (name, description, categoryId, etc.)
- An inline edit form JSX block rendered when `editing === true`

Remove all of that and replace the "Edit" button with a `Link`. The view-mode row (checkbox + name + category chip + duration + due date) stays unchanged.

Add `Link` to the existing `react-router-dom` import (it is not currently imported in `Tasks.tsx` — add it):
```tsx
import { useSearchParams, Link } from 'react-router-dom';
```

Replace the entire `TaskRow` component with:
```tsx
function TaskRow({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const cat = categories?.find(c => c.id === task.category_id);

  const handleComplete = async () => {
    await dispatch('CompleteTaskCommand', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTaskCommand', { id: task.id });
    await qc.invalidateQueries();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <button onClick={task.status === 'ongoing' ? handleComplete : task.status === 'ready' ? handleStart : undefined}
        className="text-gray-500 hover:text-white transition-colors text-lg">
        {task.status === 'done' ? '✅' : '☐'}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>{task.name}</div>
        {task.recurrence_rule && <span className="text-xs text-gray-500">🔁 Every {task.recurrence_rule.interval} {task.recurrence_rule.unit}</span>}
      </div>
      {cat && <span className="text-xs text-gray-500">{cat.icon} {cat.name}</span>}
      {task.estimated_duration_value && (
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
          {task.estimated_duration_value}{task.estimated_duration_unit?.charAt(0)}
        </span>
      )}
      {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>}
      <Link to={`/tasks/${task.id}`}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
        Edit
      </Link>
    </div>
  );
}
```

Also remove imports no longer used by `TaskRow`: `useState`, `useEffect`, `useItems`, `useResources`. Check that `NewProjectRow` and `ProjectCard` still need `useState` and `useEffect` before removing — they do, so keep those. Only remove `useItems` and `useResources` from the query imports if `ProjectCard` / `NewProjectRow` don't use them (they don't — confirm by searching the file). Remove them.

Final imports for `Tasks.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Task, Project } from '../api/queries';
import { useTasks, useCategories, useProjects } from '../api/queries';
import { dispatch } from '../api/commands';
```

- [ ] **Step 3: Update `UpNextRow` link in `Dashboard.tsx`**

In `packages/frontend/src/pages/Dashboard.tsx`, find the `UpNextRow` component. Change the `<Link>` inside it from:
```tsx
<Link to={`/tasks?status=${task.status}`} className="flex-1 text-white hover:text-indigo-300 transition-colors">
```
to:
```tsx
<Link to={`/tasks/${task.id}`} className="flex-1 text-white hover:text-indigo-300 transition-colors">
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Start the dev server and verify manually**

Run `npm run dev:frontend` (backend + Docker must be running for live data).

Check at `http://localhost:5173`:

1. **Tasks page** — "Edit" on any task row is now a link; clicking it navigates to `/tasks/<id>` and shows the TaskDetail page
2. **TaskDetail page** — all fields pre-populated from the task; Save dispatches `UpdateTaskCommand`; Start/Complete buttons appear for `ready`/`ongoing` tasks; `← Back to Tasks` returns to list
3. **Items section** — each attached item shows a colour-coded status badge (`🛒 To Buy` yellow / `✅ Available` green / `📦 Consumed` gray) and a ✕ remove button; clicking ✕ removes the item; the add-item dropdown shows all unattached items with their status emoji
4. **Dashboard Up Next** — clicking a task name navigates to `/tasks/<id>` instead of the filtered tasks list

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/App.tsx \
        packages/frontend/src/pages/Tasks.tsx \
        packages/frontend/src/pages/Dashboard.tsx
git commit -m "feat(frontend): wire TaskDetail route and update navigation"
```

---

## Completion Summary

Update this section when all tasks are done:

- Date completed: —
- Tasks completed: 0 / 3
- Deviations from spec: —
