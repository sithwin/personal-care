# Tasks & Projects Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build inline task editing, a full project lifecycle (Draft → Planned → Active → Done), and a split-view Tasks + Projects page.

**Architecture:** Five phases — Phase 1–2 are pure backend (new commands, events, handlers, projectors); Phase 3–5 are pure frontend (updated interfaces, TaskRow edit form, ProjectCard, split-view layout). Phases can be worked in parallel by two engineers once Phase 1 and 2 are done.

**Tech Stack:** Node.js 20 · TypeScript 5 · PostgreSQL 16 · Express · pg · vitest (backend); React 18 · Vite · Tailwind · TanStack Query (frontend)

## Global Constraints

- No new npm dependencies in either package
- Named exports only — never `export default`
- `import type` for type-only imports
- Never `any` — use `unknown` with guards at system boundaries
- `const` by default, `let` only when reassignment needed
- Test files use `.spec.ts` — never `.test.ts`, co-located with source
- Wrap every async route handler with `asyncHandler` (already set up)
- All domain aggregates: private constructor, `static reconstruct`, one method per command
- Repository interfaces in domain/application layer; SQL only in infrastructure

---

## File Map

### Phase 1 — Backend: UpdateTaskCommand

| File | Action |
|---|---|
| `packages/backend/src/domain/task/events/TaskUpdated.ts` | Create |
| `packages/backend/src/domain/task/commands/UpdateTaskCommand.ts` | Create |
| `packages/backend/src/domain/task/Task.ts` | Modify — add `update()`, handle `TaskUpdated` in `reconstruct` |
| `packages/backend/src/application/command-handlers/task/UpdateTaskHandler.ts` | Create |
| `packages/backend/src/application/command-handlers/task/UpdateTaskHandler.spec.ts` | Create |
| `packages/backend/src/application/ports/ITaskViewRepository.ts` | Modify — add `updateFields()` |
| `packages/backend/src/infrastructure/persistence/views/PgTaskViewRepository.ts` | Modify — implement `updateFields()` |
| `packages/backend/src/infrastructure/projections/tasks.projector.ts` | Modify — handle `TaskUpdated` |
| `packages/backend/src/api/validation/task-commands.schema.ts` | Modify — add `UpdateTaskCommand` schema |
| `packages/backend/src/infrastructure/composition-root.ts` | Modify — register `UpdateTaskHandler` |

### Phase 2 — Backend: Project lifecycle

| File | Action |
|---|---|
| `packages/backend/src/db/migrations/002_project_enhancements.sql` | Create |
| `packages/backend/src/domain/project/events/ProjectPlanned.ts` | Create |
| `packages/backend/src/domain/project/events/ProjectStarted.ts` | Create |
| `packages/backend/src/domain/project/events/ProjectPaused.ts` | Create |
| `packages/backend/src/domain/project/events/ProjectResumed.ts` | Create |
| `packages/backend/src/domain/project/events/ProjectUpdated.ts` | Create |
| `packages/backend/src/domain/project/commands/PlanProjectCommand.ts` | Create |
| `packages/backend/src/domain/project/commands/StartProjectCommand.ts` | Create |
| `packages/backend/src/domain/project/commands/PauseProjectCommand.ts` | Create |
| `packages/backend/src/domain/project/commands/ResumeProjectCommand.ts` | Create |
| `packages/backend/src/domain/project/commands/UpdateProjectCommand.ts` | Create |
| `packages/backend/src/domain/project/Project.ts` | Modify — new state fields + 5 new methods |
| `packages/backend/src/application/command-handlers/project/PlanProjectHandler.ts` | Create |
| `packages/backend/src/application/command-handlers/project/PlanProjectHandler.spec.ts` | Create |
| `packages/backend/src/application/command-handlers/project/StartProjectHandler.ts` | Create |
| `packages/backend/src/application/command-handlers/project/StartProjectHandler.spec.ts` | Create |
| `packages/backend/src/application/command-handlers/project/PauseProjectHandler.ts` | Create |
| `packages/backend/src/application/command-handlers/project/PauseProjectHandler.spec.ts` | Create |
| `packages/backend/src/application/command-handlers/project/ResumeProjectHandler.ts` | Create |
| `packages/backend/src/application/command-handlers/project/ResumeProjectHandler.spec.ts` | Create |
| `packages/backend/src/application/command-handlers/project/UpdateProjectHandler.ts` | Create |
| `packages/backend/src/application/command-handlers/project/UpdateProjectHandler.spec.ts` | Create |
| `packages/backend/src/application/ports/IProjectViewRepository.ts` | Modify — 5 new methods |
| `packages/backend/src/infrastructure/persistence/views/PgProjectViewRepository.ts` | Modify — implement new methods, fix insert to use `status = 'draft'` |
| `packages/backend/src/infrastructure/projections/projects.projector.ts` | Modify — handle 5 new events |
| `packages/backend/src/application/ports/IProjectQueryService.ts` | Modify — update `ProjectView` type |
| `packages/backend/src/infrastructure/queries/PgProjectQueryService.ts` | Modify — progress join + derived status |
| `packages/backend/src/api/validation/project-commands.schema.ts` | Modify — 5 new schemas |
| `packages/backend/src/infrastructure/composition-root.ts` | Modify — register 5 new handlers |

### Phase 3 — Frontend: Edit task UI

| File | Action |
|---|---|
| `packages/frontend/src/api/queries.ts` | Modify — type `TaskItem`, `TaskResource`, update `Task` and `Project` interfaces |
| `packages/frontend/src/pages/Tasks.tsx` | Modify — expand `TaskRow` with editing state + full edit form |

### Phase 4 — Frontend: Project cards

| File | Action |
|---|---|
| `packages/frontend/src/pages/Tasks.tsx` | Modify — add `ProjectCard`, `NewProjectRow`, project section |

### Phase 5 — Frontend: Split-view assembly

| File | Action |
|---|---|
| `packages/frontend/src/pages/Tasks.tsx` | Modify — wire split-view layout, `TasksSection`, `ProjectsSection` |

---

## Phase 1 — Backend: UpdateTaskCommand

### Task 1: TaskUpdated event, UpdateTaskCommand, Task.update(), UpdateTaskHandler

**Files:**
- Create: `packages/backend/src/domain/task/events/TaskUpdated.ts`
- Create: `packages/backend/src/domain/task/commands/UpdateTaskCommand.ts`
- Modify: `packages/backend/src/domain/task/Task.ts`
- Create: `packages/backend/src/application/command-handlers/task/UpdateTaskHandler.ts`
- Create: `packages/backend/src/application/command-handlers/task/UpdateTaskHandler.spec.ts`

**Interfaces:**
- Produces: `UpdateTaskCommand` interface, `TaskUpdated` class, `Task.update()` method, `UpdateTaskHandler.handle()`

---

- [x] **Step 1: Create UpdateTaskCommand**

Create `packages/backend/src/domain/task/commands/UpdateTaskCommand.ts`:

```typescript
import type { UUID, EstimatedDuration } from '../../../types';

export interface UpdateTaskCommand {
  readonly type: 'UpdateTaskCommand';
  readonly payload: {
    readonly id: UUID;
    readonly name?: string;
    readonly categoryId?: UUID;
    readonly description?: string;
    readonly estimatedDuration?: EstimatedDuration;
    readonly dueDate?: string;
  };
}
```

- [x] **Step 2: Create TaskUpdated event**

Create `packages/backend/src/domain/task/events/TaskUpdated.ts`:

```typescript
import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateTaskCommand } from '../commands/UpdateTaskCommand';

export class TaskUpdated extends DomainEvent {
  constructor(readonly payload: UpdateTaskCommand['payload']) {
    super('TaskUpdated', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
```

- [x] **Step 3: Write the failing test for UpdateTaskHandler**

Create `packages/backend/src/application/command-handlers/task/UpdateTaskHandler.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { UpdateTaskHandler } from './UpdateTaskHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { UpdateTaskCommand } from '../../../domain/task/commands/UpdateTaskCommand';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'task-1',
    aggregateType: 'task',
    eventType: 'TaskCreated',
    payload: { id: 'task-1', name: 'Morning run', categoryId: 'cat-1' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('UpdateTaskHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: UpdateTaskCommand = {
      type: 'UpdateTaskCommand',
      payload: { id: 'task-1', name: 'Evening run' },
    };
    const mockStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    await expect(new UpdateTaskHandler(mockStore).handle(cmd)).rejects.toThrow('Task not found');
    expect(mockStore.append).not.toHaveBeenCalled();
  });

  it('appends TaskUpdated with expectedVersion equal to history.length', async () => {
    const cmd: UpdateTaskCommand = {
      type: 'UpdateTaskCommand',
      payload: { id: 'task-1', name: 'Evening run' },
    };
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{
      id: 2, aggregateId: 'task-1', aggregateType: 'task',
      eventType: 'TaskUpdated', payload: { id: 'task-1', name: 'Evening run' },
      version: 2, createdAt: new Date(),
    }];
    const mockStore = {
      append: vi.fn().mockResolvedValue(stored),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const result = await new UpdateTaskHandler(mockStore).handle(cmd);

    expect(mockStore.getEvents).toHaveBeenCalledWith('task-1');
    const [events, version] = vi.mocked(mockStore.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('TaskUpdated');
    expect(version).toBe(history.length);
    expect(result).toBe(stored);
  });
});
```

- [x] **Step 4: Run the test — expect FAIL (UpdateTaskHandler not defined)**

```bash
npx vitest run packages/backend/src/application/command-handlers/task/UpdateTaskHandler.spec.ts
```

Expected: FAIL — "Cannot find module './UpdateTaskHandler'"

- [x] **Step 5: Create UpdateTaskHandler**

Create `packages/backend/src/application/command-handlers/task/UpdateTaskHandler.ts`:

```typescript
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateTaskCommand } from '../../../domain/task/commands/UpdateTaskCommand';
import { Task } from '../../../domain/task/Task';

export class UpdateTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateTaskCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [x] **Step 6: Add `update()` to Task domain**

Open `packages/backend/src/domain/task/Task.ts`. Add import at top:

```typescript
import type { UpdateTaskCommand } from './commands/UpdateTaskCommand';
import { TaskUpdated } from './events/TaskUpdated';
```

Add `TaskUpdated` handling in `reconstruct` — insert after the `RecurrenceSkipped` branch:

```typescript
} else if (event.eventType === 'TaskUpdated') {
  state = {
    ...(state as TaskState),
    name: (payload.name as string | undefined) ?? state.name,
    categoryId: (payload.categoryId as UUID | undefined) ?? state.categoryId,
    dueDate: (payload.dueDate as string | undefined) ?? state.dueDate,
  };
}
```

Add the `update()` instance method after `skipRecurrence`:

```typescript
update(cmd: UpdateTaskCommand): TaskUpdated {
  return new TaskUpdated(cmd.payload);
}
```

- [x] **Step 7: Run the test — expect PASS**

```bash
npx vitest run packages/backend/src/application/command-handlers/task/UpdateTaskHandler.spec.ts
```

Expected: PASS (2 tests)

- [x] **Step 8: Commit**

```bash
git add packages/backend/src/domain/task/events/TaskUpdated.ts
git add packages/backend/src/domain/task/commands/UpdateTaskCommand.ts
git add packages/backend/src/domain/task/Task.ts
git add packages/backend/src/application/command-handlers/task/UpdateTaskHandler.ts
git add packages/backend/src/application/command-handlers/task/UpdateTaskHandler.spec.ts
git commit -m "feat(task): add UpdateTaskCommand, TaskUpdated event, UpdateTaskHandler"
```

---

### Task 2: ITaskViewRepository.updateFields + projector + schema + composition root

**Files:**
- Modify: `packages/backend/src/application/ports/ITaskViewRepository.ts`
- Modify: `packages/backend/src/infrastructure/persistence/views/PgTaskViewRepository.ts`
- Modify: `packages/backend/src/infrastructure/projections/tasks.projector.ts`
- Modify: `packages/backend/src/api/validation/task-commands.schema.ts`
- Modify: `packages/backend/src/infrastructure/composition-root.ts`

**Interfaces:**
- Consumes: `UpdateTaskHandler` from Task 1
- Produces: `UpdateTaskCommand` fully wired and serving POST `/commands/UpdateTaskCommand`

---

- [x] **Step 1: Add `UpdateTaskData` interface and `updateFields` to ITaskViewRepository**

Open `packages/backend/src/application/ports/ITaskViewRepository.ts`. Add after `InsertTaskData`:

```typescript
export interface UpdateTaskData {
  name: string | null;
  categoryId: string | null;
  description: string | null;
  estimatedDurationValue: number | null;
  estimatedDurationUnit: string | null;
  dueDate: string | null;
}
```

Add to `ITaskViewRepository` interface:

```typescript
updateFields(id: string, data: UpdateTaskData): Promise<void>;
```

- [x] **Step 2: Implement `updateFields` in PgTaskViewRepository**

Open `packages/backend/src/infrastructure/persistence/views/PgTaskViewRepository.ts`. Add after `setProjectId`:

```typescript
async updateFields(id: string, data: UpdateTaskData): Promise<void> {
  await this.pool.query(
    `UPDATE tasks_view SET
       name = COALESCE($1, name),
       category_id = COALESCE($2, category_id),
       description = COALESCE($3, description),
       estimated_duration_value = COALESCE($4, estimated_duration_value),
       estimated_duration_unit = COALESCE($5, estimated_duration_unit),
       due_date = COALESCE($6, due_date)
     WHERE id = $7`,
    [data.name, data.categoryId, data.description,
     data.estimatedDurationValue, data.estimatedDurationUnit,
     data.dueDate, id],
  );
}
```

Add the import for `UpdateTaskData` at the top of the file:

```typescript
import type { ITaskViewRepository, InsertTaskData, TaskViewRow, UpdateTaskData } from '../../../application/ports/ITaskViewRepository';
```

- [x] **Step 3: Handle `TaskUpdated` in tasks projector**

Open `packages/backend/src/infrastructure/projections/tasks.projector.ts`. Add a new case inside the `switch` block after `TaskPromotedToProject`:

```typescript
case 'TaskUpdated': {
  const dur = p.estimatedDuration as { value: number; unit: string } | undefined;
  await taskRepo.updateFields(p.id as string, {
    name: (p.name as string | undefined) ?? null,
    categoryId: (p.categoryId as string | undefined) ?? null,
    description: (p.description as string | undefined) ?? null,
    estimatedDurationValue: dur?.value ?? null,
    estimatedDurationUnit: dur?.unit ?? null,
    dueDate: (p.dueDate as string | undefined) ?? null,
  });
  break;
}
```

- [x] **Step 4: Add UpdateTaskCommand Zod schema**

Open `packages/backend/src/api/validation/task-commands.schema.ts`. Add inside `taskCommandSchemas`:

```typescript
UpdateTaskCommand: z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().optional(),
  estimatedDuration: z.object({ value: z.number(), unit: z.enum(['hour', 'day']) }).optional(),
  dueDate: z.string().optional(),
}),
```

- [x] **Step 5: Register UpdateTaskHandler in composition root**

Open `packages/backend/src/infrastructure/composition-root.ts`. Add import:

```typescript
import { UpdateTaskHandler } from '../application/command-handlers/task/UpdateTaskHandler';
```

Add registration after `CreateTaskHandler`:

```typescript
commandBus.register('UpdateTaskCommand', new UpdateTaskHandler(eventStore));
```

- [x] **Step 6: Compile check**

```bash
npx tsc --noEmit -p packages/backend/tsconfig.json
```

Expected: no errors.

- [x] **Step 7: Run all backend tests**

```bash
npx vitest run --project backend
```

Expected: all pass.

- [x] **Step 8: Commit**

```bash
git add packages/backend/src/application/ports/ITaskViewRepository.ts
git add packages/backend/src/infrastructure/persistence/views/PgTaskViewRepository.ts
git add packages/backend/src/infrastructure/projections/tasks.projector.ts
git add packages/backend/src/api/validation/task-commands.schema.ts
git add packages/backend/src/infrastructure/composition-root.ts
git commit -m "feat(task): wire UpdateTaskCommand through projector, repo, schema, bus"
```

---

## Phase 2 — Backend: Project lifecycle

### Task 3: DB migration + Project domain (events, commands, updated aggregate)

**Files:**
- Create: `packages/backend/src/db/migrations/002_project_enhancements.sql`
- Create: `packages/backend/src/domain/project/events/ProjectPlanned.ts`
- Create: `packages/backend/src/domain/project/events/ProjectStarted.ts`
- Create: `packages/backend/src/domain/project/events/ProjectPaused.ts`
- Create: `packages/backend/src/domain/project/events/ProjectResumed.ts`
- Create: `packages/backend/src/domain/project/events/ProjectUpdated.ts`
- Create: `packages/backend/src/domain/project/commands/PlanProjectCommand.ts`
- Create: `packages/backend/src/domain/project/commands/StartProjectCommand.ts`
- Create: `packages/backend/src/domain/project/commands/PauseProjectCommand.ts`
- Create: `packages/backend/src/domain/project/commands/ResumeProjectCommand.ts`
- Create: `packages/backend/src/domain/project/commands/UpdateProjectCommand.ts`
- Modify: `packages/backend/src/domain/project/Project.ts`

**Interfaces:**
- Produces: `Project.plan()`, `Project.start()`, `Project.pause()`, `Project.resume()`, `Project.update()` — used by Task 4–5 handlers

---

- [x] **Step 1: Create DB migration**

Create `packages/backend/src/db/migrations/002_project_enhancements.sql`:

```sql
ALTER TABLE projects_view ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE projects_view ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects_view ALTER COLUMN status SET DEFAULT 'draft';
```

- [x] **Step 2: Register migration in migrate.ts**

Open `packages/backend/src/db/migrate.ts`. After the `001_projections.sql` pool.query call (around line 21), add:

```typescript
const sql2 = readFileSync(join(__dirname, 'migrations/002_project_enhancements.sql'), 'utf8');
await pool.query(sql2);
```

- [x] **Step 3: Create the 5 new commands**

Create `packages/backend/src/domain/project/commands/PlanProjectCommand.ts`:
```typescript
import type { UUID } from '../../../types';
export interface PlanProjectCommand {
  type: 'PlanProjectCommand';
  payload: { id: UUID; startDate: string; endDate: string; };
}
```

Create `packages/backend/src/domain/project/commands/StartProjectCommand.ts`:
```typescript
import type { UUID } from '../../../types';
export interface StartProjectCommand {
  type: 'StartProjectCommand';
  payload: { id: UUID; endDate?: string; };
}
```

Create `packages/backend/src/domain/project/commands/PauseProjectCommand.ts`:
```typescript
import type { UUID } from '../../../types';
export interface PauseProjectCommand {
  type: 'PauseProjectCommand';
  payload: { id: UUID; };
}
```

Create `packages/backend/src/domain/project/commands/ResumeProjectCommand.ts`:
```typescript
import type { UUID } from '../../../types';
export interface ResumeProjectCommand {
  type: 'ResumeProjectCommand';
  payload: { id: UUID; };
}
```

Create `packages/backend/src/domain/project/commands/UpdateProjectCommand.ts`:
```typescript
import type { UUID } from '../../../types';
export interface UpdateProjectCommand {
  type: 'UpdateProjectCommand';
  payload: { id: UUID; name?: string; description?: string; priority?: 'low' | 'medium' | 'high'; };
}
```

- [x] **Step 4: Create the 5 new events**

Create `packages/backend/src/domain/project/events/ProjectPlanned.ts`:
```typescript
import { DomainEvent } from '../../shared/DomainEvent';
import type { PlanProjectCommand } from '../commands/PlanProjectCommand';
export class ProjectPlanned extends DomainEvent {
  constructor(readonly payload: PlanProjectCommand['payload']) {
    super('ProjectPlanned', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
```

Create `packages/backend/src/domain/project/events/ProjectStarted.ts`:
```typescript
import { DomainEvent } from '../../shared/DomainEvent';
import type { StartProjectCommand } from '../commands/StartProjectCommand';
export class ProjectStarted extends DomainEvent {
  constructor(readonly payload: StartProjectCommand['payload']) {
    super('ProjectStarted', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
```

Create `packages/backend/src/domain/project/events/ProjectPaused.ts`:
```typescript
import { DomainEvent } from '../../shared/DomainEvent';
import type { PauseProjectCommand } from '../commands/PauseProjectCommand';
export class ProjectPaused extends DomainEvent {
  constructor(readonly payload: PauseProjectCommand['payload']) {
    super('ProjectPaused', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
```

Create `packages/backend/src/domain/project/events/ProjectResumed.ts`:
```typescript
import { DomainEvent } from '../../shared/DomainEvent';
import type { ResumeProjectCommand } from '../commands/ResumeProjectCommand';
export class ProjectResumed extends DomainEvent {
  constructor(readonly payload: ResumeProjectCommand['payload']) {
    super('ProjectResumed', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
```

Create `packages/backend/src/domain/project/events/ProjectUpdated.ts`:
```typescript
import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateProjectCommand } from '../commands/UpdateProjectCommand';
export class ProjectUpdated extends DomainEvent {
  constructor(readonly payload: UpdateProjectCommand['payload']) {
    super('ProjectUpdated', payload.id, 'project', payload as unknown as Record<string, unknown>);
  }
}
```

- [x] **Step 5: Rewrite Project.ts**

Replace the entire contents of `packages/backend/src/domain/project/Project.ts`:

```typescript
import type { StoredEvent, UUID } from '../../types';
import type { CreateProjectCommand } from './commands/CreateProjectCommand';
import type { AddTaskToProjectCommand } from './commands/AddTaskToProjectCommand';
import type { CompleteProjectCommand } from './commands/CompleteProjectCommand';
import type { PlanProjectCommand } from './commands/PlanProjectCommand';
import type { StartProjectCommand } from './commands/StartProjectCommand';
import type { PauseProjectCommand } from './commands/PauseProjectCommand';
import type { ResumeProjectCommand } from './commands/ResumeProjectCommand';
import type { UpdateProjectCommand } from './commands/UpdateProjectCommand';
import { ProjectCreated } from './events/ProjectCreated';
import { TaskAddedToProject } from './events/TaskAddedToProject';
import { ProjectCompleted } from './events/ProjectCompleted';
import { ProjectPlanned } from './events/ProjectPlanned';
import { ProjectStarted } from './events/ProjectStarted';
import { ProjectPaused } from './events/ProjectPaused';
import { ProjectResumed } from './events/ProjectResumed';
import { ProjectUpdated } from './events/ProjectUpdated';

type ProjectStatus = 'draft' | 'planned' | 'active' | 'on_hold' | 'done';
type Priority = 'low' | 'medium' | 'high';

interface ProjectState {
  readonly id: UUID;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly taskIds: UUID[];
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly priority: Priority;
}

export class Project {
  private constructor(private readonly state: ProjectState) {}

  static reconstruct(history: StoredEvent[]): Project | null {
    let state: ProjectState | null = null;
    for (const event of history) {
      const p = event.payload;
      if (event.eventType === 'ProjectCreated') {
        state = {
          id: p.id as UUID,
          name: p.name as string,
          status: 'draft',
          taskIds: [],
          startDate: null,
          endDate: (p.dueDate as string | undefined) ?? null,
          priority: 'medium',
        };
      } else if (state !== null) {
        if (event.eventType === 'TaskAddedToProject' || event.eventType === 'TaskPromotedToProject') {
          state = { ...(state as ProjectState), taskIds: [...state.taskIds, p.taskId as UUID] };
        } else if (event.eventType === 'ProjectCompleted') {
          state = { ...(state as ProjectState), status: 'done' };
        } else if (event.eventType === 'ProjectPlanned') {
          state = { ...(state as ProjectState), status: 'planned', startDate: p.startDate as string, endDate: p.endDate as string };
        } else if (event.eventType === 'ProjectStarted') {
          state = {
            ...(state as ProjectState),
            status: 'active',
            endDate: (p.endDate as string | undefined) ?? state.endDate,
          };
        } else if (event.eventType === 'ProjectPaused') {
          state = { ...(state as ProjectState), status: 'on_hold' };
        } else if (event.eventType === 'ProjectResumed') {
          state = { ...(state as ProjectState), status: 'active' };
        } else if (event.eventType === 'ProjectUpdated') {
          state = {
            ...(state as ProjectState),
            name: (p.name as string | undefined) ?? state.name,
            priority: (p.priority as Priority | undefined) ?? state.priority,
          };
        }
      }
    }
    return state !== null ? new Project(state) : null;
  }

  static create(cmd: CreateProjectCommand): ProjectCreated {
    return new ProjectCreated(cmd.payload);
  }

  addTask(cmd: AddTaskToProjectCommand): TaskAddedToProject {
    return new TaskAddedToProject(cmd.payload);
  }

  complete(_cmd: CompleteProjectCommand): ProjectCompleted {
    if (this.state.status === 'done') throw new Error('Project already completed');
    return new ProjectCompleted({ id: this.state.id });
  }

  plan(cmd: PlanProjectCommand): ProjectPlanned {
    if (this.state.status === 'done') throw new Error('Cannot plan a completed project');
    return new ProjectPlanned(cmd.payload);
  }

  start(cmd: StartProjectCommand): ProjectStarted {
    if (this.state.status === 'done') throw new Error('Cannot start a completed project');
    return new ProjectStarted(cmd.payload);
  }

  pause(_cmd: PauseProjectCommand): ProjectPaused {
    if (this.state.status !== 'active') throw new Error('Project is not active');
    return new ProjectPaused({ id: this.state.id });
  }

  resume(_cmd: ResumeProjectCommand): ProjectResumed {
    if (this.state.status !== 'on_hold') throw new Error('Project is not on hold');
    return new ProjectResumed({ id: this.state.id });
  }

  update(cmd: UpdateProjectCommand): ProjectUpdated {
    if (this.state.status === 'done') throw new Error('Cannot update a completed project');
    return new ProjectUpdated(cmd.payload);
  }
}
```

- [x] **Step 6: Compile check**

```bash
npx tsc --noEmit -p packages/backend/tsconfig.json
```

Expected: no errors.

- [x] **Step 7: Commit**

```bash
git add packages/backend/src/db/migrations/002_project_enhancements.sql
git add packages/backend/src/domain/project/
git commit -m "feat(project): add lifecycle commands, events, and updated Project aggregate"
```

---

### Task 4: Plan/Start/Pause/Resume/Update handlers + specs

**Files:**
- Create: all 5 handler files + 5 spec files listed above

**Interfaces:**
- Consumes: `Project` from Task 3
- Produces: 5 handler classes with `handle()` — consumed by Task 6 (composition root)

---

- [x] **Step 1: Write failing specs for all 5 handlers**

Create `packages/backend/src/application/command-handlers/project/PlanProjectHandler.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { PlanProjectHandler } from './PlanProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(id = 'proj-1'): StoredEvent {
  return {
    id: 1, aggregateId: id, aggregateType: 'project', eventType: 'ProjectCreated',
    payload: { id, name: 'Test', categoryId: 'cat-1' }, version: 1, createdAt: new Date(),
  };
}

describe('PlanProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new PlanProjectHandler(store).handle({ type: 'PlanProjectCommand', payload: { id: 'proj-1', startDate: '2026-07-01', endDate: '2026-07-31' } })).rejects.toThrow('Project not found');
  });

  it('appends ProjectPlanned with expectedVersion = history.length', async () => {
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{ id: 2, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectPlanned', payload: { id: 'proj-1', startDate: '2026-07-01', endDate: '2026-07-31' }, version: 2, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new PlanProjectHandler(store).handle({ type: 'PlanProjectCommand', payload: { id: 'proj-1', startDate: '2026-07-01', endDate: '2026-07-31' } });
    const [events, version] = vi.mocked(store.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('ProjectPlanned');
    expect(version).toBe(1);
    expect(result).toBe(stored);
  });
});
```

Create `packages/backend/src/application/command-handlers/project/StartProjectHandler.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { StartProjectHandler } from './StartProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(id = 'proj-1'): StoredEvent {
  return { id: 1, aggregateId: id, aggregateType: 'project', eventType: 'ProjectCreated', payload: { id, name: 'T', categoryId: 'cat-1' }, version: 1, createdAt: new Date() };
}

describe('StartProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new StartProjectHandler(store).handle({ type: 'StartProjectCommand', payload: { id: 'proj-1' } })).rejects.toThrow('Project not found');
  });

  it('appends ProjectStarted', async () => {
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{ id: 2, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectStarted', payload: { id: 'proj-1' }, version: 2, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new StartProjectHandler(store).handle({ type: 'StartProjectCommand', payload: { id: 'proj-1' } });
    const [events, version] = vi.mocked(store.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('ProjectStarted');
    expect(version).toBe(1);
    expect(result).toBe(stored);
  });
});
```

Create `packages/backend/src/application/command-handlers/project/PauseProjectHandler.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { PauseProjectHandler } from './PauseProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makeHistory(): StoredEvent[] {
  return [
    { id: 1, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectCreated', payload: { id: 'proj-1', name: 'T', categoryId: 'cat-1' }, version: 1, createdAt: new Date() },
    { id: 2, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectStarted', payload: { id: 'proj-1' }, version: 2, createdAt: new Date() },
  ];
}

describe('PauseProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new PauseProjectHandler(store).handle({ type: 'PauseProjectCommand', payload: { id: 'proj-1' } })).rejects.toThrow('Project not found');
  });

  it('throws Project is not active when status is draft', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([makeHistory()[0]!]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new PauseProjectHandler(store).handle({ type: 'PauseProjectCommand', payload: { id: 'proj-1' } })).rejects.toThrow('Project is not active');
  });

  it('appends ProjectPaused when active', async () => {
    const history = makeHistory();
    const stored: StoredEvent[] = [{ id: 3, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectPaused', payload: { id: 'proj-1' }, version: 3, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new PauseProjectHandler(store).handle({ type: 'PauseProjectCommand', payload: { id: 'proj-1' } });
    expect(vi.mocked(store.append).mock.calls[0]![0][0].eventType).toBe('ProjectPaused');
    expect(result).toBe(stored);
  });
});
```

Create `packages/backend/src/application/command-handlers/project/ResumeProjectHandler.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ResumeProjectHandler } from './ResumeProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makePausedHistory(): StoredEvent[] {
  return [
    { id: 1, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectCreated', payload: { id: 'p1', name: 'T', categoryId: 'c1' }, version: 1, createdAt: new Date() },
    { id: 2, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectStarted', payload: { id: 'p1' }, version: 2, createdAt: new Date() },
    { id: 3, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectPaused', payload: { id: 'p1' }, version: 3, createdAt: new Date() },
  ];
}

describe('ResumeProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new ResumeProjectHandler(store).handle({ type: 'ResumeProjectCommand', payload: { id: 'p1' } })).rejects.toThrow('Project not found');
  });

  it('throws Project is not on hold when status is draft', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([makePausedHistory()[0]!]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new ResumeProjectHandler(store).handle({ type: 'ResumeProjectCommand', payload: { id: 'p1' } })).rejects.toThrow('Project is not on hold');
  });

  it('appends ProjectResumed when on_hold', async () => {
    const history = makePausedHistory();
    const stored: StoredEvent[] = [{ id: 4, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectResumed', payload: { id: 'p1' }, version: 4, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await new ResumeProjectHandler(store).handle({ type: 'ResumeProjectCommand', payload: { id: 'p1' } });
    expect(vi.mocked(store.append).mock.calls[0]![0][0].eventType).toBe('ProjectResumed');
  });
});
```

Create `packages/backend/src/application/command-handlers/project/UpdateProjectHandler.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { UpdateProjectHandler } from './UpdateProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(): StoredEvent {
  return { id: 1, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectCreated', payload: { id: 'p1', name: 'Old', categoryId: 'c1' }, version: 1, createdAt: new Date() };
}

describe('UpdateProjectHandler', () => {
  it('throws Project not found when history is empty', async () => {
    const store = { getEvents: vi.fn().mockResolvedValue([]), append: vi.fn(), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    await expect(new UpdateProjectHandler(store).handle({ type: 'UpdateProjectCommand', payload: { id: 'p1', name: 'New' } })).rejects.toThrow('Project not found');
  });

  it('appends ProjectUpdated with expectedVersion = history.length', async () => {
    const history = [makeCreatedEvent()];
    const stored: StoredEvent[] = [{ id: 2, aggregateId: 'p1', aggregateType: 'project', eventType: 'ProjectUpdated', payload: { id: 'p1', name: 'New' }, version: 2, createdAt: new Date() }];
    const store = { getEvents: vi.fn().mockResolvedValue(history), append: vi.fn().mockResolvedValue(stored), getAllEventsSince: vi.fn() } as unknown as IEventStore;
    const result = await new UpdateProjectHandler(store).handle({ type: 'UpdateProjectCommand', payload: { id: 'p1', name: 'New' } });
    const [events, version] = vi.mocked(store.append).mock.calls[0]!;
    expect(events[0].eventType).toBe('ProjectUpdated');
    expect(version).toBe(1);
    expect(result).toBe(stored);
  });
});
```

- [x] **Step 2: Run all 5 specs — expect FAIL**

```bash
npx vitest run packages/backend/src/application/command-handlers/project/
```

Expected: FAIL — "Cannot find module './PlanProjectHandler'" (and others)

- [x] **Step 3: Create all 5 handlers**

Create `packages/backend/src/application/command-handlers/project/PlanProjectHandler.ts`:
```typescript
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { PlanProjectCommand } from '../../../domain/project/commands/PlanProjectCommand';
import { Project } from '../../../domain/project/Project';

export class PlanProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: PlanProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.plan(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

Create `packages/backend/src/application/command-handlers/project/StartProjectHandler.ts`:
```typescript
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { StartProjectCommand } from '../../../domain/project/commands/StartProjectCommand';
import { Project } from '../../../domain/project/Project';

export class StartProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: StartProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.start(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

Create `packages/backend/src/application/command-handlers/project/PauseProjectHandler.ts`:
```typescript
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { PauseProjectCommand } from '../../../domain/project/commands/PauseProjectCommand';
import { Project } from '../../../domain/project/Project';

export class PauseProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: PauseProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.pause(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

Create `packages/backend/src/application/command-handlers/project/ResumeProjectHandler.ts`:
```typescript
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { ResumeProjectCommand } from '../../../domain/project/commands/ResumeProjectCommand';
import { Project } from '../../../domain/project/Project';

export class ResumeProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: ResumeProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.resume(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

Create `packages/backend/src/application/command-handlers/project/UpdateProjectHandler.ts`:
```typescript
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateProjectCommand } from '../../../domain/project/commands/UpdateProjectCommand';
import { Project } from '../../../domain/project/Project';

export class UpdateProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: UpdateProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [x] **Step 4: Run all 5 specs — expect PASS**

```bash
npx vitest run packages/backend/src/application/command-handlers/project/
```

Expected: PASS (all tests)

- [x] **Step 5: Commit**

```bash
git add packages/backend/src/application/command-handlers/project/
git commit -m "feat(project): add Plan/Start/Pause/Resume/Update handlers with specs"
```

---

### Task 5: Repository, projector, query service, schema, composition root

**Files:**
- Modify: `packages/backend/src/application/ports/IProjectViewRepository.ts`
- Modify: `packages/backend/src/infrastructure/persistence/views/PgProjectViewRepository.ts`
- Modify: `packages/backend/src/infrastructure/projections/projects.projector.ts`
- Modify: `packages/backend/src/application/ports/IProjectQueryService.ts`
- Modify: `packages/backend/src/infrastructure/queries/PgProjectQueryService.ts`
- Modify: `packages/backend/src/api/validation/project-commands.schema.ts`
- Modify: `packages/backend/src/infrastructure/composition-root.ts`

**Interfaces:**
- Produces: `GET /api/v1/projects` returns projects with `priority`, `start_date`, `display_status`, `progress`; all 5 new commands fully functional via `POST /commands/<type>`

---

- [x] **Step 1: Update IProjectViewRepository**

Replace the entire contents of `packages/backend/src/application/ports/IProjectViewRepository.ts`:

```typescript
export interface InsertProjectData {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  dueDate: string | null;
}

export interface IProjectViewRepository {
  insert(data: InsertProjectData): Promise<void>;
  appendTask(projectId: string, taskId: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  plan(id: string, startDate: string, endDate: string): Promise<void>;
  start(id: string, endDate: string | null): Promise<void>;
  pause(id: string): Promise<void>;
  resume(id: string): Promise<void>;
  updateMeta(id: string, data: { name?: string | null; description?: string | null; priority?: string | null }): Promise<void>;
}
```

- [x] **Step 2: Implement new methods in PgProjectViewRepository**

Replace the entire contents of `packages/backend/src/infrastructure/persistence/views/PgProjectViewRepository.ts`:

```typescript
import type { Pool } from 'pg';
import type { IProjectViewRepository, InsertProjectData } from '../../../application/ports/IProjectViewRepository';

export class PgProjectViewRepository implements IProjectViewRepository {
  constructor(private readonly pool: Pool) {}

  async insert(data: InsertProjectData): Promise<void> {
    await this.pool.query(
      `INSERT INTO projects_view (id, name, description, category_id, due_date, status)
       VALUES ($1,$2,$3,$4,$5,'draft') ON CONFLICT (id) DO NOTHING`,
      [data.id, data.name, data.description, data.categoryId, data.dueDate],
    );
  }

  async appendTask(projectId: string, taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE projects_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2`,
      [taskId, projectId],
    );
  }

  async markCompleted(id: string): Promise<void> {
    await this.pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['done', id]);
  }

  async plan(id: string, startDate: string, endDate: string): Promise<void> {
    await this.pool.query(
      'UPDATE projects_view SET status = $1, start_date = $2, due_date = $3 WHERE id = $4',
      ['planned', startDate, endDate, id],
    );
  }

  async start(id: string, endDate: string | null): Promise<void> {
    await this.pool.query(
      'UPDATE projects_view SET status = $1, due_date = COALESCE($2, due_date) WHERE id = $3',
      ['active', endDate, id],
    );
  }

  async pause(id: string): Promise<void> {
    await this.pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['on_hold', id]);
  }

  async resume(id: string): Promise<void> {
    await this.pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['active', id]);
  }

  async updateMeta(id: string, data: { name?: string | null; description?: string | null; priority?: string | null }): Promise<void> {
    await this.pool.query(
      `UPDATE projects_view SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         priority = COALESCE($3, priority)
       WHERE id = $4`,
      [data.name ?? null, data.description ?? null, data.priority ?? null, id],
    );
  }
}
```

- [x] **Step 3: Update projects projector to handle new events**

Replace the entire contents of `packages/backend/src/infrastructure/projections/projects.projector.ts`:

```typescript
import type { Projector } from '../../application/ports/IProjector';
import type { IProjectViewRepository } from '../../application/ports/IProjectViewRepository';

export function createProjectsProjector(projectRepo: IProjectViewRepository): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ProjectCreated':
        await projectRepo.insert({
          id: p.id as string,
          name: p.name as string,
          description: (p.description as string | undefined) ?? null,
          categoryId: p.categoryId as string,
          dueDate: (p.dueDate as string | undefined) ?? null,
        });
        break;
      case 'TaskAddedToProject':
      case 'TaskPromotedToProject':
        await projectRepo.appendTask(p.projectId as string, p.taskId as string);
        break;
      case 'ProjectCompleted':
        await projectRepo.markCompleted(p.id as string);
        break;
      case 'ProjectPlanned':
        await projectRepo.plan(p.id as string, p.startDate as string, p.endDate as string);
        break;
      case 'ProjectStarted':
        await projectRepo.start(p.id as string, (p.endDate as string | undefined) ?? null);
        break;
      case 'ProjectPaused':
        await projectRepo.pause(p.id as string);
        break;
      case 'ProjectResumed':
        await projectRepo.resume(p.id as string);
        break;
      case 'ProjectUpdated':
        await projectRepo.updateMeta(p.id as string, {
          name: (p.name as string | undefined) ?? null,
          description: (p.description as string | undefined) ?? null,
          priority: (p.priority as string | undefined) ?? null,
        });
        break;
      default:
        break;
    }
  };
}
```

- [x] **Step 4: Update IProjectQueryService with new ProjectView fields**

Replace `packages/backend/src/application/ports/IProjectQueryService.ts`:

```typescript
export interface ProjectFilter {
  status?: string;
  categoryId?: string;
}

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  task_ids: string[];
  created_at: string;
  progress: number;
  display_status: 'draft' | 'planned' | 'active' | 'on_hold' | 'done' | 'off_track' | 'at_risk';
}

export interface IProjectQueryService {
  getAll(filter: ProjectFilter): Promise<ProjectView[]>;
  getById(id: string): Promise<ProjectView | null>;
}
```

- [x] **Step 5: Update PgProjectQueryService with progress + derived status**

Replace the entire contents of `packages/backend/src/infrastructure/queries/PgProjectQueryService.ts`:

```typescript
import { type Pool } from 'pg';
import type { IProjectQueryService, ProjectFilter, ProjectView } from '../../application/ports/IProjectQueryService';

type StoredStatus = 'draft' | 'planned' | 'active' | 'on_hold' | 'done';
type DisplayStatus = 'draft' | 'planned' | 'active' | 'on_hold' | 'done' | 'off_track' | 'at_risk';

function deriveDisplayStatus(
  storedStatus: StoredStatus,
  startDate: string | null,
  dueDate: string | null,
  progress: number,
): DisplayStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (storedStatus === 'planned' && startDate !== null) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (today >= start) return 'off_track';
  }

  if (storedStatus === 'active' && dueDate !== null) {
    const end = new Date(dueDate);
    end.setHours(0, 0, 0, 0);
    const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd < 7 && progress < 0.8) return 'at_risk';
  }

  return storedStatus;
}

export class PgProjectQueryService implements IProjectQueryService {
  constructor(private readonly pool: Pool) {}

  async getAll(filter: ProjectFilter): Promise<ProjectView[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.status) {
      conditions.push(`p.status = $${params.length + 1}`);
      params.push(filter.status);
    }
    if (filter.categoryId) {
      conditions.push(`p.category_id = $${params.length + 1}`);
      params.push(filter.categoryId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT p.*,
              CASE
                WHEN array_length(p.task_ids, 1) IS NULL THEN 0
                ELSE (
                  SELECT COUNT(*)::float / array_length(p.task_ids, 1)
                  FROM tasks_view t
                  WHERE t.id = ANY(p.task_ids) AND t.status = 'done'
                )
              END AS progress
       FROM projects_view p
       ${where}
       ORDER BY p.created_at DESC`,
      params,
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      ...(row as Omit<ProjectView, 'progress' | 'display_status'>),
      progress: Number(row.progress ?? 0),
      display_status: deriveDisplayStatus(
        row.status as StoredStatus,
        row.start_date as string | null,
        row.due_date as string | null,
        Number(row.progress ?? 0),
      ),
    }));
  }

  async getById(id: string): Promise<ProjectView | null> {
    const result = await this.pool.query(
      `SELECT p.*,
              CASE
                WHEN array_length(p.task_ids, 1) IS NULL THEN 0
                ELSE (
                  SELECT COUNT(*)::float / array_length(p.task_ids, 1)
                  FROM tasks_view t
                  WHERE t.id = ANY(p.task_ids) AND t.status = 'done'
                )
              END AS progress
       FROM projects_view p WHERE p.id = $1`,
      [id],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as Record<string, unknown>;
    return {
      ...(row as Omit<ProjectView, 'progress' | 'display_status'>),
      progress: Number(row.progress ?? 0),
      display_status: deriveDisplayStatus(
        row.status as StoredStatus,
        row.start_date as string | null,
        row.due_date as string | null,
        Number(row.progress ?? 0),
      ),
    };
  }
}
```

- [x] **Step 6: Add new schemas to project-commands.schema.ts**

Open `packages/backend/src/api/validation/project-commands.schema.ts`. Add inside `projectCommandSchemas`:

```typescript
PlanProjectCommand: z.object({
  id: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
}),
StartProjectCommand: z.object({
  id: z.string().uuid(),
  endDate: z.string().optional(),
}),
PauseProjectCommand: z.object({
  id: z.string().uuid(),
}),
ResumeProjectCommand: z.object({
  id: z.string().uuid(),
}),
UpdateProjectCommand: z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
}),
```

- [x] **Step 7: Register all 5 new handlers in composition root**

Open `packages/backend/src/infrastructure/composition-root.ts`. Add imports:

```typescript
import { PlanProjectHandler } from '../application/command-handlers/project/PlanProjectHandler';
import { StartProjectHandler } from '../application/command-handlers/project/StartProjectHandler';
import { PauseProjectHandler } from '../application/command-handlers/project/PauseProjectHandler';
import { ResumeProjectHandler } from '../application/command-handlers/project/ResumeProjectHandler';
import { UpdateProjectHandler } from '../application/command-handlers/project/UpdateProjectHandler';
```

Add registrations after `CompleteProjectHandler`:

```typescript
commandBus.register('PlanProjectCommand', new PlanProjectHandler(eventStore));
commandBus.register('StartProjectCommand', new StartProjectHandler(eventStore));
commandBus.register('PauseProjectCommand', new PauseProjectHandler(eventStore));
commandBus.register('ResumeProjectCommand', new ResumeProjectHandler(eventStore));
commandBus.register('UpdateProjectCommand', new UpdateProjectHandler(eventStore));
```

- [x] **Step 8: Register migration in migrate.ts**

Open `packages/backend/src/db/migrate.ts`. After the `001_projections.sql` pool.query call, add:

```typescript
const sql2 = readFileSync(join(__dirname, 'migrations/002_project_enhancements.sql'), 'utf8');
await pool.query(sql2);
```

- [x] **Step 9: Compile check + full test run**

```bash
npx tsc --noEmit -p packages/backend/tsconfig.json
npx vitest run --project backend
```

Expected: no type errors, all tests pass.

- [x] **Step 10: Commit**

```bash
git add packages/backend/src/application/ports/IProjectViewRepository.ts
git add packages/backend/src/application/ports/IProjectQueryService.ts
git add packages/backend/src/infrastructure/persistence/views/PgProjectViewRepository.ts
git add packages/backend/src/infrastructure/projections/projects.projector.ts
git add packages/backend/src/infrastructure/queries/PgProjectQueryService.ts
git add packages/backend/src/api/validation/project-commands.schema.ts
git add packages/backend/src/infrastructure/composition-root.ts
git add packages/backend/src/db/migrations/002_project_enhancements.sql
git commit -m "feat(project): wire lifecycle commands through repo, projector, query service, bus"
```

---

## Phase 3 — Frontend: Edit task UI

### Task 6: Update TypeScript interfaces

**Files:**
- Modify: `packages/frontend/src/api/queries.ts`

**Interfaces:**
- Consumes: new backend `ProjectView` fields (priority, start_date, display_status, progress)
- Produces: typed `TaskItem`, `TaskResource`, updated `Task`, updated `Project`

---

- [x] **Step 1: Update queries.ts interfaces**

Open `packages/frontend/src/api/queries.ts`. Replace the `Task` and `Project` interfaces:

```typescript
export interface TaskItem {
  item_id: string;
  consumable: boolean;
  item_status: string;
}

export interface TaskResource {
  resource_id: string;
  title: string;
  type: string;
}

export interface Task {
  id: string; name: string; description?: string; category_id: string; project_id?: string;
  status: 'ready' | 'ongoing' | 'pending' | 'planned' | 'done';
  estimated_duration_value?: number; estimated_duration_unit?: string;
  due_date?: string; scheduled_date?: string; scheduled_start_time?: string;
  recurrence_rule?: { interval: number; unit: string };
  completion_count: number;
  required_items: TaskItem[];
  resources: TaskResource[];
}

export interface Project {
  id: string; name: string; description?: string; category_id: string;
  status: 'draft' | 'planned' | 'active' | 'on_hold' | 'done';
  display_status: 'draft' | 'planned' | 'active' | 'on_hold' | 'done' | 'off_track' | 'at_risk';
  priority: 'low' | 'medium' | 'high';
  start_date?: string; due_date?: string;
  task_ids: string[];
  progress: number;
}
```

- [x] **Step 2: Compile check**

```bash
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Expected: no errors (fix any type errors surfaced from the interface changes).

- [x] **Step 3: Commit**

```bash
git add packages/frontend/src/api/queries.ts
git commit -m "feat(frontend): update Task and Project TypeScript interfaces"
```

---

### Task 7: TaskRow inline edit form

**Files:**
- Modify: `packages/frontend/src/pages/Tasks.tsx`

**Interfaces:**
- Consumes: `UpdateTaskCommand`, `AddItemRequirementCommand`, `AttachResourceToTaskCommand`, `DetachResourceFromTaskCommand` via `dispatch()`; `useItems()`, `useResources()`, `useCategories()`, `useProjects()` hooks
- Produces: `TaskRow` with `editing` boolean state and full inline edit form

---

- [x] **Step 1: Rewrite TaskRow in Tasks.tsx**

Open `packages/frontend/src/pages/Tasks.tsx`. Replace the entire `TaskRow` function (lines 10–46) with:

```tsx
function TaskRow({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();
  const cat = categories?.find(c => c.id === task.category_id);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.name);
  const [categoryId, setCategoryId] = useState(task.category_id);
  const [description, setDescription] = useState(task.description ?? '');
  const [durationValue, setDurationValue] = useState(String(task.estimated_duration_value ?? ''));
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day'>(
    (task.estimated_duration_unit as 'hour' | 'day') ?? 'hour',
  );
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? '');

  const handleSave = async () => {
    await dispatch('UpdateTaskCommand', {
      id: task.id,
      name: name.trim() || undefined,
      categoryId: categoryId || undefined,
      description: description || undefined,
      estimatedDuration: durationValue ? { value: Number(durationValue), unit: durationUnit } : undefined,
      dueDate: dueDate || undefined,
    });
    await qc.invalidateQueries();
    setEditing(false);
  };

  const handleCancel = () => {
    setName(task.name);
    setCategoryId(task.category_id);
    setDescription(task.description ?? '');
    setDurationValue(String(task.estimated_duration_value ?? ''));
    setDurationUnit((task.estimated_duration_unit as 'hour' | 'day') ?? 'hour');
    setDueDate(task.due_date?.slice(0, 10) ?? '');
    setEditing(false);
  };

  const handleAddItem = async (itemId: string) => {
    await dispatch('AddItemRequirementCommand', { taskId: task.id, itemId, consumable: true });
    await qc.invalidateQueries();
  };

  const handleAddResource = async (resourceId: string) => {
    await dispatch('AttachResourceToTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const handleDetachResource = async (resourceId: string) => {
    await dispatch('DetachResourceFromTaskCommand', { taskId: task.id, resourceId });
    await qc.invalidateQueries();
  };

  const handleAssignProject = async (projectId: string) => {
    if (!projectId) return;
    await dispatch('AddTaskToProjectCommand', { projectId, taskId: task.id });
    await qc.invalidateQueries();
  };

  const handleComplete = async () => {
    await dispatch('CompleteTaskCommand', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTaskCommand', { id: task.id });
    await qc.invalidateQueries();
  };

  const attachedItemIds = new Set(task.required_items.map(i => i.item_id));
  const attachedResourceIds = new Set(task.resources.map(r => r.resource_id));
  const availableItems = allItems?.filter(i => !attachedItemIds.has(i.id)) ?? [];
  const availableResources = allResources?.filter(r => !attachedResourceIds.has(r.id)) ?? [];

  if (editing) {
    return (
      <div className="flex flex-col gap-3 px-4 py-3 bg-gray-900 border border-indigo-700 rounded-lg">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name..."
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)"
          rows={2}
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500 resize-none" />
        <div className="flex gap-2">
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={task.project_id ?? ''} onChange={e => handleAssignProject(e.target.value)}
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

        {/* Items */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Items required</span>
          {task.required_items.map(i => (
            <span key={i.item_id} className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">
              {allItems?.find(a => a.id === i.item_id)?.name ?? i.item_id}
              {i.consumable && ' (consumable)'}
            </span>
          ))}
          {availableItems.length > 0 && (
            <select defaultValue="" onChange={e => { if (e.target.value) handleAddItem(e.target.value); e.target.value = ''; }}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              <option value="">+ Add item…</option>
              {availableItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          )}
        </div>

        {/* Resources */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Resources</span>
          {task.resources.map(r => (
            <div key={r.resource_id} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">{r.title}</span>
              <button type="button" onClick={() => handleDetachResource(r.resource_id)}
                className="text-xs text-gray-500 hover:text-red-400">✕</button>
            </div>
          ))}
          {availableResources.length > 0 && (
            <select defaultValue="" onChange={e => { if (e.target.value) handleAddResource(e.target.value); e.target.value = ''; }}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              <option value="">+ Add resource…</option>
              {availableResources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button type="button" onClick={handleSave} disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
            Save
          </button>
        </div>
      </div>
    );
  }

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
      <button type="button" onClick={() => setEditing(true)}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
        Edit
      </button>
    </div>
  );
}
```

- [x] **Step 2: Add missing imports to Tasks.tsx**

Ensure these imports are at the top of `packages/frontend/src/pages/Tasks.tsx`:

```tsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Task } from '../api/queries';
import { useTasks, useCategories, useItems, useResources, useProjects } from '../api/queries';
import { dispatch } from '../api/commands';
```

- [x] **Step 3: Compile check**

```bash
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Tasks.tsx
git commit -m "feat(frontend): add full inline task edit form with items and resources"
```

---

## Phase 4 — Frontend: Project cards

### Task 8: ProjectCard component + NewProjectRow + project section

**Files:**
- Modify: `packages/frontend/src/pages/Tasks.tsx`

**Interfaces:**
- Consumes: `useProjects()`, `Project` from queries; `dispatch` for all project commands
- Produces: `ProjectCard` component; `NewProjectRow` component; `ProjectsSection` rendering cards + create form

---

- [x] **Step 1: Add STATUS_CONFIG constant and ProjectCard to Tasks.tsx**

Add the following before the `Tasks` export function in `packages/frontend/src/pages/Tasks.tsx`:

```tsx
import type { Project } from '../api/queries';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',      color: 'bg-gray-700 text-gray-300' },
  planned:   { label: 'Planned',    color: 'bg-blue-900 text-blue-300' },
  active:    { label: 'Active',     color: 'bg-green-900 text-green-300' },
  off_track: { label: 'Off Track',  color: 'bg-red-900 text-red-300' },
  at_risk:   { label: 'At Risk',    color: 'bg-amber-900 text-amber-300' },
  on_hold:   { label: 'On Hold',    color: 'bg-gray-700 text-gray-300' },
  done:      { label: 'Done',       color: 'bg-gray-800 text-gray-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: '▲ High',   color: 'text-red-400' },
  medium: { label: '▶ Medium', color: 'text-amber-400' },
  low:    { label: '▼ Low',    color: 'text-gray-400' },
};

function ProjectCard({ project }: { project: Project }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const cat = categories?.find(c => c.id === project.category_id);
  const status = STATUS_CONFIG[project.display_status] ?? STATUS_CONFIG.draft!;
  const priority = PRIORITY_CONFIG[project.priority] ?? PRIORITY_CONFIG.medium!;
  const progressPct = Math.round(project.progress * 100);

  const handlePlan = async () => {
    const startDate = window.prompt('Start date (YYYY-MM-DD):');
    if (!startDate) return;
    const endDate = window.prompt('End date (YYYY-MM-DD):');
    if (!endDate) return;
    await dispatch('PlanProjectCommand', { id: project.id, startDate, endDate });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    let endDate: string | undefined;
    if (!project.due_date) {
      const input = window.prompt('End date (YYYY-MM-DD):');
      if (!input) return;
      endDate = input;
    }
    await dispatch('StartProjectCommand', { id: project.id, endDate });
    await qc.invalidateQueries();
  };

  const handlePause = async () => {
    await dispatch('PauseProjectCommand', { id: project.id });
    await qc.invalidateQueries();
  };

  const handleResume = async () => {
    await dispatch('ResumeProjectCommand', { id: project.id });
    await qc.invalidateQueries();
  };

  const handleComplete = async () => {
    await dispatch('CompleteProjectCommand', { id: project.id });
    await qc.invalidateQueries();
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl w-56 flex-shrink-0 hover:border-gray-700 transition-colors">
      <div>
        <div className="text-sm font-semibold text-white">
          {cat?.icon} {project.name}
        </div>
        {project.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</div>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
        <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
      </div>

      {(project.start_date || project.due_date) && (
        <div className="text-xs text-gray-500">
          {project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–'}
          {' → '}
          {project.due_date ? new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–'}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span><span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {project.display_status !== 'done' && (
        <div className="flex gap-1.5 flex-wrap mt-auto">
          {(project.display_status === 'draft') && (
            <>
              <button type="button" onClick={handlePlan}
                className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600">Plan</button>
              <button type="button" onClick={handleStart}
                className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">Start</button>
            </>
          )}
          {(project.display_status === 'planned' || project.display_status === 'off_track') && (
            <button type="button" onClick={handleStart}
              className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">Start</button>
          )}
          {(project.display_status === 'active' || project.display_status === 'at_risk') && (
            <button type="button" onClick={handlePause}
              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">On Hold</button>
          )}
          {project.display_status === 'on_hold' && (
            <button type="button" onClick={handleResume}
              className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">Resume</button>
          )}
          <button type="button" onClick={handleComplete}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500">Done</button>
        </div>
      )}
    </div>
  );
}

function NewProjectRow({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!categoryId && categories?.[0]) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const handleCreate = async () => {
    const id = uuidv4();
    await dispatch('CreateProjectCommand', { id, name: name.trim(), categoryId, description: description || undefined });
    if (priority !== 'medium') {
      await dispatch('UpdateProjectCommand', { id, priority });
    }
    await qc.invalidateQueries();
    onDone();
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-900 border border-indigo-700 border-dashed rounded-xl w-56 flex-shrink-0">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name..." autoFocus
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
        {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
      <select value={priority} onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
        <option value="high">▲ High</option>
        <option value="medium">▶ Medium</option>
        <option value="low">▼ Low</option>
      </select>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 resize-none" />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-2 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
        <button type="button" onClick={handleCreate} disabled={!name.trim() || !categoryId}
          className="px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
          Create
        </button>
      </div>
    </div>
  );
}
```

Ensure these top-level imports are present in `Tasks.tsx` (add any that are missing):

```tsx
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Project } from '../api/queries';
import { useTasks, useCategories, useItems, useResources, useProjects } from '../api/queries';
```

- [x] **Step 2: Compile check**

```bash
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Tasks.tsx
git commit -m "feat(frontend): add ProjectCard and NewProjectRow components"
```

---

## Phase 5 — Frontend: Split-view layout

### Task 9: Wire up split-view page

**Files:**
- Modify: `packages/frontend/src/pages/Tasks.tsx`

**Interfaces:**
- Consumes: `TaskRow` (Task 7), `ProjectCard` + `NewProjectRow` (Task 8), `useTasks()`, `useProjects()`
- Produces: final split-view `Tasks` page with two stacked sections

---

- [x] **Step 1: Replace the Tasks export function**

Replace the existing `export function Tasks()` in `packages/frontend/src/pages/Tasks.tsx` with:

```tsx
export function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'ready';
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const { data: tasks, isLoading: tasksLoading } = useTasks({ status, ...(categoryId ? { categoryId } : {}) });
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: categories } = useCategories();
  const [addingProject, setAddingProject] = useState(false);

  return (
    <div className="flex flex-col gap-8">

      {/* Tasks section */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Tasks</h2>
        <div className="flex gap-1 flex-wrap mb-4">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setSearchParams({ status: s })}
              className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'}`}>
              {s}
            </button>
          ))}
          {categoryId && categories && (
            <span className="ml-2 text-sm text-gray-400 flex items-center gap-1">
              {categories.find(c => c.id === categoryId)?.icon} {categories.find(c => c.id === categoryId)?.name}
              <button onClick={() => setSearchParams({ status })} className="text-gray-600 hover:text-white ml-1">×</button>
            </span>
          )}
        </div>

        {tasksLoading && <div className="text-gray-500 text-sm">Loading...</div>}
        {!tasksLoading && tasks?.length === 0 && (
          <div className="text-gray-600 text-sm">No tasks with status &quot;{status}&quot;</div>
        )}
        <div className="flex flex-col gap-2 max-w-2xl">
          {tasks?.map(task => <TaskRow key={task.id} task={task} />)}
        </div>
      </section>

      {/* Projects section */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Projects</h2>
        {projectsLoading && <div className="text-gray-500 text-sm">Loading...</div>}
        <div className="flex flex-wrap gap-3">
          {projects?.map(p => <ProjectCard key={p.id} project={p} />)}
          {addingProject && <NewProjectRow onDone={() => setAddingProject(false)} />}
        </div>
        {!addingProject && (
          <button type="button" onClick={() => setAddingProject(true)}
            className="mt-3 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">
            + New Project
          </button>
        )}
      </section>

    </div>
  );
}
```

- [x] **Step 2: Compile check**

```bash
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Expected: no errors.

- [x] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [x] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Tasks.tsx
git commit -m "feat(frontend): assemble split-view Tasks + Projects page"
```

---

## Implementation Phases Summary

| Phase | Tasks | What it delivers |
|---|---|---|
| 1 | 1–2 | `UpdateTaskCommand` fully wired backend-to-API |
| 2 | 3–5 | Project lifecycle: Draft → Planned → Active → Done, with derived status and progress |
| 3 | 6–7 | Task inline edit form with items + resources |
| 4 | 8 | Project cards with lifecycle actions + create form |
| 5 | 9 | Final split-view page assembly |

Phases 1 and 2 have no dependencies on each other and can be worked in parallel.

---

## Completion Summary

**Date completed:** 2026-06-17
**Total tasks:** 9 (5 backend, 4 frontend)
**Total tests:** 207 passing (56 test files)
**Commits:** 11 commits (938911e → 3a6cf6c)

### Deviations from plan

- **Task 5 boundary fix:** `deriveDisplayStatus` used `daysUntilEnd < 7`; corrected to `<= 7` per spec intent (commit 267404b).
- **Task 7 project state fix:** `TaskRow` project dropdown initially read `task.project_id` directly (no local state); fixed so Cancel can undo project selection (commit e7c8760).
- **Task 8 ESLint compliance:** `ProjectCard`/`NewProjectRow` required temporary wiring into the `Tasks` export to satisfy the no-unused-vars hook; replaced in Task 9 with the final split-view layout.
- **`commands/index.ts` barrel:** Not updated with 5 new project commands — all handlers use direct imports; barrel omission has no runtime impact.
- **No unit tests for new `Project` lifecycle methods:** Brief only required handler specs; domain invariants are indirectly covered by handler tests.
