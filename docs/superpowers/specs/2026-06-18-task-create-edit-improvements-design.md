# Task Create & Edit Improvements — Design Spec

**Date:** 2026-06-18

## Problem

1. The task **create** form (Dashboard "Up Next" panel) only accepts name and category, even though `CreateTaskCommand` supports description, project, duration, and due date.
2. The task **edit** page (`TaskDetail`) already has items and resources sections, but the "add" dropdowns are conditionally rendered — hidden when no unattached items/resources exist — making them invisible and confusing.
3. Neither the create nor edit form supports **inline creation** of new items or resources; users must leave the task form to create them first.

## Goals

- Full-featured task creation on a dedicated `/tasks/new` page (all fields, items, resources).
- Inline item and resource creation from both create and edit pages.
- A shared `TaskForm` component so create and edit stay in sync.

---

## Component Architecture

### New: `TaskForm` component

**Location:** `packages/frontend/src/components/tasks/TaskForm.tsx`

Renders all task fields and the items/resources sections. Owns only UI state (field values, which inline sub-forms are open). No data fetching — all data is passed in as props.

```ts
interface TaskFormProps {
  mode: 'create' | 'edit';
  task?: Task;                  // edit mode — pre-populates fields
  categories: Category[];
  projects: Project[];
  allItems: Item[];
  allResources: Resource[];
  onSubmit: (data: TaskFormData) => Promise<void>;
}

interface TaskFormData {
  name: string;
  description?: string;
  categoryId: string;
  projectId?: string;
  estimatedDuration?: { value: number; unit: 'hour' | 'day' };
  dueDate?: string;
  pendingItems: Array<
    | { type: 'existing'; itemId: string }
    | { type: 'new'; name: string; categoryId: string }
  >;
  pendingResources: Array<
    | { type: 'existing'; resourceId: string }
    | { type: 'new'; title: string; resourceType: 'link' | 'note' | 'video' | 'file' | 'doc'; url?: string }
  >;
}
```

**Fields rendered:**
- Name (text input, required)
- Description (textarea, optional)
- Category (select, required)
- Project (select, optional — "No project" default)
- Duration value (number input) + unit (hour/day select)
- Due date (date input)
- Items section (see below)
- Resources section (see below)

---

### New: `/tasks/new` page

**Location:** `packages/frontend/src/pages/NewTask.tsx`

**Route:** `GET /tasks/new` (added to `App.tsx` before `/tasks/:id`)

Fetches categories, projects, items, resources. Renders `TaskForm` in create mode with empty initial state. On submit, fires commands in sequence then navigates to `/tasks/:id`:

1. `CreateTaskCommand` — name, categoryId, description?, projectId?, estimatedDuration?, dueDate?
2. For each `pendingItem` of type `'new'`: `CreateItemCommand` (name, categoryId) → `AddItemRequirementCommand` (taskId, itemId, consumable: true)
3. For each `pendingItem` of type `'existing'`: `AddItemRequirementCommand` (taskId, itemId, consumable: true)
4. For each `pendingResource` of type `'new'`: `CreateResourceCommand` (title, type, url?) → `AttachResourceToTaskCommand` (taskId, resourceId)
5. For each `pendingResource` of type `'existing'`: `AttachResourceToTaskCommand` (taskId, resourceId)

---

### Updated: `TaskDetail` page

Becomes a thin wrapper: loads task data, fetches all items/resources, renders `TaskForm` in edit mode.

In edit mode, `TaskForm` dispatches commands immediately on each user action for items and resources (add/remove fires at click time, not on form submit). The `pendingItems` and `pendingResources` fields in `TaskFormData` are unused in edit mode — `onSubmit` only carries the detail fields. The `onSubmit` callback fires `UpdateTaskCommand` and, if project changed, `AddTaskToProjectCommand`.

---

### Updated: Dashboard

`NewTaskRow` component is removed. The `+ Add Task` button navigates to `/tasks/new` using React Router's `useNavigate`.

---

## Items Section (in `TaskForm`)

**Attached items list:** same as today — name, status badge, ✕ remove button.

**"Add existing" dropdown:** always visible. Shows all unattached items. If no unattached items exist, renders as disabled with placeholder "No items available."

**"+ New item" button:** always visible below the dropdown. Clicking it expands an inline sub-form:

```
[ Item name input        ] [ Category: inherits task's category ▼ ] [ Add ]
```

- Category defaults to the task's current category but is editable.
- Pressing Add:
  - **Create mode:** appends `{ type: 'new', name, categoryId }` to the local pending list and collapses the sub-form. The pending item is shown in the attached list in italic/dimmed text with a "•" prefix to distinguish it from confirmed items, plus an × to remove it before submit.
  - **Edit mode:** fires `CreateItemCommand` → `AddItemRequirementCommand` immediately, then invalidates queries.

---

## Resources Section (in `TaskForm`)

**Attached resources list:** same as today — title, ✕ remove button.

**"Add existing" dropdown:** always visible. If no unattached resources exist, renders disabled with placeholder "No resources available."

**"+ New resource" button:** always visible. Clicking it expands an inline sub-form:

```
[ Title input ] [ Type ▼: link/note/video/file/doc ] [ URL input (shown when type=link) ] [ Add ]
```

- Pressing Add:
  - **Create mode:** appends `{ type: 'new', title, resourceType, url? }` to pending list, collapses sub-form. Shown inline with ×.
  - **Edit mode:** fires `CreateResourceCommand` → `AttachResourceToTaskCommand` immediately.

---

## Error Handling

- The create page wraps the submit sequence in a try/catch. On failure it shows an inline error string below the submit button (e.g. "Failed to create task — please try again.") and stays on `/tasks/new`.
- If the task is created but a subsequent item/resource attachment fails, the page still navigates to `/tasks/:id` so the user can retry from the edit page. The error is logged to the console.
- Edit-mode immediate-dispatch actions (add/remove item, add/remove resource) show no explicit error UI for now — same as the current behaviour.

---

## Files Affected

| File | Change |
|------|--------|
| `packages/frontend/src/components/tasks/TaskForm.tsx` | **New** — shared form component |
| `packages/frontend/src/pages/NewTask.tsx` | **New** — create page |
| `packages/frontend/src/pages/TaskDetail.tsx` | **Updated** — thin wrapper using TaskForm |
| `packages/frontend/src/pages/Dashboard.tsx` | **Updated** — remove NewTaskRow, navigate to /tasks/new |
| `packages/frontend/src/App.tsx` | **Updated** — add /tasks/new route before /tasks/:id |

---

## Out of Scope

- Recurrence rule editing (already on TaskDetail, stays as-is outside TaskForm)
- Item quantity, price, notes fields (inline create uses name + category only — full item creation is on the Items page)
- Resource notes field (inline create uses title + type + url — full resource creation is on the Resources page)
