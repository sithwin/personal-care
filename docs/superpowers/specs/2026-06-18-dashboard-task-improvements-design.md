# Dashboard Task Improvements — Design

**Date:** 2026-06-18

## Problem

Two gaps in the Dashboard UX:

1. **No way to add a task from the Dashboard.** The `CommandBar` component was doing double duty as both a search affordance and a task creator, making neither role clear. Users had no obvious path to capture a new task without navigating away.

2. **Up Next tasks are not actionable.** The Up Next section renders tasks as static rows with a decorative checkbox — no way to start, complete, or navigate to the full task.

## Scope

Changes are contained entirely to the frontend:
- `packages/frontend/src/components/layout/CommandBar.tsx`
- `packages/frontend/src/pages/Dashboard.tsx`

No backend changes, no new routes, no new API commands.

## Design

### 1. CommandBar — search only

Strip `CreateTaskCommand` dispatch, the category `<select>`, and the "Create Task" button from `CommandBar.tsx`. The modal's form collapses to a single text input. Submitting navigates to `/tasks?search=<value>` (the Tasks page does not act on this parameter yet — full search is a future feature). The bar retains its keyboard shortcut (`⌘K` / `Ctrl+K`) and visual affordance but no longer creates tasks.

**Why:** Separates two distinct concerns that were conflated in one component. The CommandBar is a navigation/search entry point; task creation belongs where the tasks live.

### 2. "+ Add Task" button and inline form in Up Next

The Up Next section header gains a `+ Add Task` button on the right edge:

```
UP NEXT                          [+ Add Task]
```

Clicking the button mounts a `NewTaskRow` inline form at the top of the task list. Fields:
- **Task name** — text input, required, auto-focused
- **Category** — select populated from `useCategories()`, required

Save dispatches `CreateTaskCommand({ id: uuidv4(), name, categoryId })` then calls `qc.invalidateQueries()`. The form is dismissed after a successful save or on Cancel. The inline form pattern is identical to `NewItemRow` in `Items.tsx`.

**Default status:** New tasks created this way default to whatever `CreateTaskCommand` sets on the domain aggregate (currently `ready`), so they appear in Up Next immediately.

### 3. Up Next task rows — actions

Each task row gains two interactive elements:

| Element | Behaviour |
|---|---|
| **Checkbox button** | `status === 'ready'` → dispatches `StartTaskCommand({ id })`; `status === 'ongoing'` → dispatches `CompleteTaskCommand({ id, itemDisposals: [] })`. No-op for other statuses. |
| **Task name** | Rendered as a `<Link to="/tasks?status=<task.status>">` so the user can navigate to the Tasks page pre-filtered to that status for full editing. |

Duration and due date chips on the right remain display-only.

## Components affected

| File | Change |
|---|---|
| `CommandBar.tsx` | Remove `CreateTaskCommand` dispatch, category select, and Create button. Form becomes search input only. |
| `Dashboard.tsx` | Add `NewTaskRow` component (inline, local to file). Up Next header gets `+ Add Task` button and `adding` state. Up Next task rows get functional checkbox and linked name. |

## Out of scope

- Full-text search implementation (CommandBar navigates to `/tasks?search=X` as a placeholder).
- Task editing from the Dashboard (users navigate to the Tasks page for that).
- Up Next sorting or filtering.
