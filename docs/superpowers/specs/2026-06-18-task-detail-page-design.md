# Task Detail Page — Design

**Date:** 2026-06-18

## Problem

Three gaps in the current task editing UX:

1. **Edit and create share the same inline form.** The `TaskRow` in `Tasks.tsx` toggles between view and edit modes in-place, making it unclear which mode you're in and cramped for complex edits.
2. **Attached items cannot be removed.** `AddItemRequirementCommand` exists; no remove counterpart does. Attached items render as read-only labels.
3. **Item status is invisible in the picker.** All items appear in the add-item dropdown without a status label, so there's no way to see whether an item is already purchased (`available`) or still to buy (`to_buy`).

## Scope

- Backend: new `RemoveItemRequirementCommand` domain command + event + handler + projector update + repository method
- Frontend: new `TaskDetail` page at `/tasks/:id`; navigation changes in `Tasks.tsx`, `Dashboard.tsx`, and `App.tsx`

No schema migrations — the read model already has a `task_required_items` table managed by the projector.

---

## Backend

### New files

#### `domain/task/commands/RemoveItemRequirementCommand.ts`
```ts
import type { UUID } from '../../../types';

export interface RemoveItemRequirementCommand {
  readonly type: 'RemoveItemRequirementCommand';
  readonly payload: { readonly taskId: UUID; readonly itemId: UUID };
}
```

#### `domain/task/events/ItemRequirementRemoved.ts`
Mirrors `ItemRequirementAdded` — extends `DomainEvent`, stores `RemoveItemRequirementCommand['payload']`, aggregate type `'task'`, event type `'ItemRequirementRemoved'`.

#### `application/command-handlers/task/RemoveItemRequirementHandler.ts`
Mirrors `DetachResourceFromTaskHandler` exactly:
1. Load event history for `cmd.payload.taskId`
2. Reconstruct `Task` aggregate; throw `'Task not found'` if null
3. Call `aggregate.removeItemRequirement(cmd)` → returns `ItemRequirementRemoved`
4. Append event via `eventStore.append([event], history.length)`

### Modified files

#### `domain/task/Task.ts`
Add method adjacent to `addItemRequirement`:
```ts
removeItemRequirement(cmd: RemoveItemRequirementCommand): ItemRequirementRemoved {
  return new ItemRequirementRemoved(cmd.payload);
}
```
No invariant to enforce beyond task existence (already guaranteed by `reconstruct` check in handler).

#### `domain/task/commands/index.ts`
Add `RemoveItemRequirementCommand` to the `export type` list and the `TaskCommand` union.

#### `application/ports/ITaskViewRepository.ts`
Add:
```ts
deleteItemRequirement(taskId: string, itemId: string): Promise<void>;
```

#### `infrastructure/persistence/views/PgTaskViewRepository.ts`
Implement `deleteItemRequirement`:
```sql
DELETE FROM task_required_items WHERE task_id = $1 AND item_id = $2
```

#### `infrastructure/projections/tasks.projector.ts`
Add case to the `switch`:
```ts
case 'ItemRequirementRemoved':
  await taskRepo.deleteItemRequirement(p.taskId as string, p.itemId as string);
  await refreshTaskStatus(p.taskId as string, taskRepo);
  break;
```

#### `api/validation/task-commands.schema.ts`
Add Zod schema for `RemoveItemRequirementCommand`:
```ts
RemoveItemRequirementCommand: z.object({ taskId: z.string().uuid(), itemId: z.string().uuid() })
```

#### `api/routes/tasks.router.ts`
Register the new command (following the existing pattern for `AddItemRequirementCommand`).

#### `infrastructure/composition-root.ts`
Register `RemoveItemRequirementHandler` in the command bus.

---

## Frontend

### New file: `packages/frontend/src/pages/TaskDetail.tsx`

Single-column layout, exported as `TaskDetail`.

**Data fetching:**
- `useTask(id)` — where `id` comes from `useParams()`
- `useCategories()`, `useProjects()`, `useItems()` (no status filter — returns all items), `useResources()`
- Loading state: grey "Loading…" text; not-found state (task is null after load): "Task not found."

**Editable fields section** (controlled inputs, saved together via a single Save button):
- Name (text input, required)
- Description (textarea, optional)
- Category (select)
- Project (select, with "No project" option)
- Estimated duration: value (number) + unit (hour / day)
- Due date (date input)

Save dispatches `UpdateTaskCommand` (and `AddTaskToProjectCommand` if the project changed), then `qc.invalidateQueries()`.

**Status action buttons** (shown above Save, only when applicable):
- `status === 'ready'` → "Start" button → `StartTaskCommand`
- `status === 'ongoing'` → "Complete" button → `CompleteTaskCommand({ id, itemDisposals: [] })`

**Items section:**
- Heading: "Items required"
- Each attached item rendered as a row: `[status badge] [item name] [✕]`
  - Status badge colours: `to_buy` = yellow (`bg-yellow-900/40 text-yellow-300`), `available` = green (`bg-green-900/40 text-green-300`), `consumed` = gray (`bg-gray-700 text-gray-400`)
  - ✕ button → dispatches `RemoveItemRequirementCommand({ taskId: id, itemId })` then `invalidateQueries()`
- Below the list: a `<select>` picker showing all items not yet attached, each option labelled `[status emoji] [name]` (`🛒` for `to_buy`, `✅` for `available`, `📦` for `consumed`)
  - On change → dispatches `AddItemRequirementCommand({ taskId: id, itemId, consumable: true })` then `invalidateQueries()`

**Resources section:**
- Same pattern as the existing `TaskRow` edit form (already supports add + remove via `DetachResourceFromTaskCommand`)

**Navigation:**
- `← Back to Tasks` link at the top → `<Link to="/tasks">`

### Modified files

#### `App.tsx`
Add route before the catch-all:
```tsx
<Route path="/tasks/:id" element={<TaskDetail />} />
```

#### `Tasks.tsx` — `TaskRow`
- Remove all `editing` state, `handleSave`, `handleCancel`, and the inline edit form JSX
- Change the "Edit" button to `<Link to={/tasks/${task.id}} className="...">Edit</Link>`
- Keep the checkbox action buttons (Start / Complete) and the view-mode row unchanged

#### `Dashboard.tsx` — `UpNextRow`
Change task name link from:
```tsx
<Link to={`/tasks?status=${task.status}`}>
```
to:
```tsx
<Link to={`/tasks/${task.id}`}>
```

---

## Files touched

| File | Change |
|---|---|
| `domain/task/commands/RemoveItemRequirementCommand.ts` | New |
| `domain/task/events/ItemRequirementRemoved.ts` | New |
| `application/command-handlers/task/RemoveItemRequirementHandler.ts` | New |
| `domain/task/Task.ts` | Add `removeItemRequirement` method |
| `domain/task/commands/index.ts` | Add to union |
| `application/ports/ITaskViewRepository.ts` | Add `deleteItemRequirement` signature |
| `infrastructure/persistence/views/PgTaskViewRepository.ts` | Implement `deleteItemRequirement` |
| `infrastructure/projections/tasks.projector.ts` | Handle `ItemRequirementRemoved` |
| `api/validation/task-commands.schema.ts` | Add Zod schema |
| `api/routes/tasks.router.ts` | Register command |
| `infrastructure/composition-root.ts` | Register handler |
| `pages/TaskDetail.tsx` | New page |
| `App.tsx` | Add `/tasks/:id` route |
| `pages/Tasks.tsx` | Remove inline edit form, add Edit link |
| `pages/Dashboard.tsx` | Update UpNextRow link |

## Out of scope

- Consumable toggle per item (defaults to `true`, same as today)
- Inline search/filter within item picker
- Full-text task search (CommandBar navigates to `/tasks?search=` as a placeholder)
