# Tasks & Projects Management — Design Spec

**Date:** 2026-06-17

## Problem

Three things are missing from the UI:
1. Tasks cannot be edited after creation
2. Projects cannot be created or managed from the UI
3. Tasks cannot be assigned to projects from the UI

## Goal

A single split-view page at `/tasks` showing Tasks (top) and Projects (bottom), with full task editing and project lifecycle management.

---

## Scope

### In scope
- Inline full edit for tasks (all fields + items + resources)
- `UpdateTaskCommand` backend command
- Split-view page layout (Tasks above, Projects below)
- Project cards with auto-derived status, priority, timeline, progress
- Project lifecycle commands: Plan, Start, Pause, Resume, Done
- Project assignment dropdown on each task row
- New backend project commands and view columns

### Out of scope (future enhancements)
- Task deletion
- Project deletion
- Advanced filtering on projects
- Notifications or reminders based on project status

---

## Page Layout

Single page at `/tasks`. Two stacked sections, each independently scrollable.

```
┌─────────────────────────────────┐
│  Tasks                          │
│  [ready] [ongoing] [pending]... │
│  ─────────────────────────────  │
│  ☐  Task name   📁 Cat  📅 Due  │
│  ☐  Task name   📁 Cat  📅 Due  │
│  + Add Task (CommandBar)        │
│                                 │
│  Projects                       │
│  ─────────────────────────────  │
│  ┌──────────┐ ┌──────────┐      │
│  │ 💪 Name  │ │ 📚 Name  │      │
│  │ ● Active │ │ ▲ At Risk│      │
│  │ ▲ High   │ │ ▼ Low    │      │
│  │ Jun→Jun  │ │ Jun→Jul  │      │
│  │ ██░░ 60% │ │ ████ 90% │      │
│  │[Hold][✓] │ │ [Hold][✓]│      │
│  └──────────┘ └──────────┘      │
│  + New Project                  │
└─────────────────────────────────┘
```

---

## Task Edit (inline)

Clicking **Edit** on a task row expands it inline — same pattern as `CategoryRow` in Categories page.

### Editable fields

| Field | Input |
|---|---|
| Name | Text input |
| Category | Dropdown (from `useCategories()`) |
| Description | Textarea |
| Estimated duration | Number + `hour` / `day` dropdown |
| Due date | Date input |
| Project | Dropdown (from `useProjects()`, "None" option) |
| Items | List of current items with consumable toggle; "Add item" dropdown (no remove — no backend command exists) |
| Resources | List of current resources (title + type); "Add resource" dropdown; remove button |
| Project | Dropdown (from `useProjects()`, "None" option) |

### Command dispatch

- **Save** → dispatches `UpdateTaskCommand` with name, categoryId, description, estimatedDuration, dueDate (projectId is **not** included — project assignment is a separate action)
- **Project dropdown** → dispatches `AddTaskToProjectCommand` immediately on selection change
- **Items** → `AddItemRequirementCommand` dispatched immediately on add; no remove (no backend command exists)
- **Resources** → `AttachResourceToTaskCommand` / `DetachResourceFromTaskCommand` — dispatched immediately on add/remove
- **Cancel** → reverts name/category/description/duration/dueDate fields only; item/resource dispatches already sent cannot be undone

---

## Project Card

Cards displayed in a `flex-wrap` grid in the Projects section.

```
┌──────────────────────────────┐
│ 💪 Health Routine            │
│ ● At Risk        ▲ High      │
│ Jun 1 → Jun 28               │
│ ████████░░  75%              │
│                              │
│ [On Hold]  [Done]            │
└──────────────────────────────┘
```

### Fields
- **Name** — project name with category icon
- **Status badge** — colour-coded (see Status Machine below)
- **Priority** — `High` / `Medium` / `Low` tag
- **Timeline** — `start_date → end_date`
- **Progress bar** — `completed tasks ÷ total tasks` for tasks assigned to this project

### Contextual action buttons per state

| Stored state | Buttons shown |
|---|---|
| Draft | `[Plan]` `[Start]` |
| Planned | `[Start]` `[Done]` |
| Active / At Risk | `[On Hold]` `[Done]` |
| On Hold | `[Resume]` `[Done]` |
| Off Track | `[Start]` `[Done]` |
| Done | _(none)_ |

---

## Project Status Machine

### States

| State | Colour | Source |
|---|---|---|
| Draft | Gray | Initial — no user action |
| Planned | Blue | User clicks Plan + sets start + end date |
| Active | Green | User clicks Start (end date required if not set) |
| Off Track | Red | Auto: stored=`planned` and today ≥ start_date |
| At Risk | Amber | Auto: stored=`active` and end_date < 7 days away and progress < 80% |
| On Hold | Gray | User manually pauses from Active |
| Done | Gray (strikethrough) | User manually completes from any state |

### Auto-derived status rule (query time only — no stored value for at_risk/off_track)

```
if stored_status == 'planned' and today >= start_date  → display 'off_track'
if stored_status == 'active'
   and end_date - today < 7 days
   and progress < 0.80                                 → display 'at_risk'
otherwise                                              → display stored_status
```

### Transitions

```
draft ──[Plan]──→ planned ──[Start]──→ active ──[On Hold]──→ on_hold
  │                  │                   │                      │
  └──[Start]──→ active              [Done]               [Resume]──→ active
                   │                                            │
              (auto) off_track ──[Start]──→ active          [Done]
```

`[Done]` is available from any non-done state.

---

## Backend Changes

### Phase 1 — Task editing

**New domain artifacts:**
- `TaskUpdated` event (name, categoryId, description, estimatedDuration, dueDate — all optional; projectId excluded, handled by `AddTaskToProjectCommand`)
- `UpdateTaskCommand` + `UpdateTaskHandler`
- Zod schema for `UpdateTaskCommand`
- Register `UpdateTaskCommand` in composition root
- Projector: handle `TaskUpdated` → `taskRepo.update(id, fields)`
- `ITaskViewRepository.update()` method + `PgTaskViewRepository` implementation

### Phase 2 — Project lifecycle

**New columns on `projects_view`:**
- `priority TEXT NOT NULL DEFAULT 'medium'`
- `start_date DATE`

**New domain artifacts (one command per transition):**

| Command | Event | Payload |
|---|---|---|
| `PlanProjectCommand` | `ProjectPlanned` | id, startDate, endDate |
| `StartProjectCommand` | `ProjectStarted` | id, endDate (optional) |
| `PauseProjectCommand` | `ProjectPaused` | id |
| `ResumeProjectCommand` | `ProjectResumed` | id |
| `UpdateProjectCommand` | `ProjectUpdated` | id, name?, description?, priority? |

`CompleteProjectCommand` already exists.

**Project query service** — `getAll()` joins `tasks_view` to compute progress and derives display status at query time using the rules above.

---

## Frontend Changes

### Phase 3 — Edit task UI

- Extend `TaskRow` with `editing` boolean state
- Edit form with all fields listed above
- Items sub-section: render `task.required_items`, add from `useItems()` dropdown, dispatch immediately
- Resources sub-section: render `task.resources`, add from `useResources()` dropdown, dispatch immediately

### Phase 4 — Projects UI

- New `ProjectCard` component
- `+ New Project` inline form (name, category, priority, optional description)
- Status action buttons dispatch the appropriate project command
- `PlanProjectCommand` prompts for start + end date before dispatching
- `StartProjectCommand` prompts for end date if not already set
- Task row gains a **Project** dropdown that dispatches `AddTaskToProjectCommand` on change

### Phase 5 — Split-view layout

- Replace current `Tasks.tsx` with split-view layout
- Tasks section: existing task list + edit capability from Phase 3
- Projects section: project card grid from Phase 4
- `+ Add Task` button opens CommandBar

---

## Implementation Phases Summary

| Phase | Scope | Dependencies |
|---|---|---|
| 1 | Backend: UpdateTaskCommand | None |
| 2 | Backend: Project lifecycle commands + migration | None |
| 3 | Frontend: Inline task edit | Phase 1 |
| 4 | Frontend: Project cards + actions | Phase 2 |
| 5 | Frontend: Split-view page assembly | Phases 3 + 4 |
