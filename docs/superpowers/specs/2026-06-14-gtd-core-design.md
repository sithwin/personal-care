# GTD Core — Design Spec

**Date:** 2026-06-14
**Sub-project:** 1 of 3 (GTD Core)
**Status:** Approved for implementation

---

## Overview

A personal productivity web app built around the Getting Things Done methodology — adapted to feel modern and status-driven rather than inbox-driven. The app tracks tasks, physical items, projects, and resources, enforces life balance rules across categories, and exposes an MCP server so a scheduled Claude agent can deliver a daily briefing and intelligent suggestions.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + TypeScript |
| Architecture | CQRS + Event Sourcing |
| Database | PostgreSQL (event store + read model projections) |
| MCP Server | Node.js (Anthropic MCP SDK) |
| AI / Scheduling | Scheduled Claude agent via Claude Code `/schedule` |

---

## Data Model

### Entities

**Category**
- `id`, `name`, `icon`, `color`
- `isDefault: boolean` — Health and Study are built-in (renameable, not deletable)
- User can create any number of additional categories (Home, Cars, Bookshelf, etc.)

**Task**
- `id`, `name`, `description`
- `categoryId`, `projectId` (nullable)
- `status`: derived — never stored directly (see Status Derivation below)
- `estimatedDuration`: `{ value: number, unit: 'hour' | 'day' }` (optional)
- `dueDate` (optional)
- `scheduledDate` + `scheduledStartTime` (optional — for hourly calendar scheduling)
- `recurrenceRule`: `{ interval: number, unit: 'day' | 'week' | 'month' | 'year' }` (optional)
- `completionCount`: increments each time a recurring task is completed

**Item**
- `id`, `name`, `description`
- `categoryId`
- `status`: `to_buy | available | consumed`
- `quantity`, `price`, `notes` (optional)

**Project**
- `id`, `name`, `description`
- `categoryId`
- `status`: `active | on_hold | done`
- `dueDate` (optional)
- Ordered list of child task IDs
- Created by promoting a task (original task becomes first sub-task)

**Resource**
- `id`, `title`
- `type`: `link | note | video | file | doc`
- `url` (optional)
- `notes` (free text)
- `categoryId` (optional loose grouping)
- Many-to-many with tasks — lives independently, attaches to any number of tasks

**BalanceRule**
- `id`, `categoryId`
- `minimumCount`: number (default 1)
- `frequency`: `daily | weekly | monthly`
- `dayRestriction`: `null | 'weekend' | 'weekday'`

### Default Balance Rules (seeded at startup)

| Category | Min | Frequency | Day | Note |
|---|---|---|---|---|
| Study | 1 | daily | any | Category is built-in — rule always seeds |
| Health | 1 | daily | any | Category is built-in — rule always seeds |
| Home | 1 | weekly | weekend | Example rule — only seeds if Home category exists |
| Cars | 1 | monthly | any | Example rule — only seeds if Cars category exists |

Home and Cars are user-defined categories (not built-in). Their default balance rules are shown as suggestions on first setup; if those categories don't exist, the rules are skipped. User can add, edit, and delete all balance rules. The "monthly place to go" suggestion is deferred to Sub-project 3 (needs weather + location data).

### Task Status Derivation

Status is computed by the projection — never stored as a field directly:

1. Any required item has `status = to_buy` → task is **pending**
2. Has future `dueDate` and not yet started → task is **planned**
3. `StartTask` command has been fired → task is **ongoing**
4. All required items are `available` (or no items required), no date constraint → task is **ready**
5. `CompleteTask` command has been fired → task is **done**

### Task ↔ Item Relationship

A task can require multiple items. Each requirement is marked:
- `consumable: true` — item is used up on task completion (oil filter, paint)
- `consumable: false` — item remains available after task (drill, ladder)

At task completion, the user is prompted per item: "Used up or still available?"

---

## CQRS — Commands & Events

### PostgreSQL Event Store Schema

```sql
events (
  id            BIGSERIAL PRIMARY KEY,
  aggregate_id  UUID NOT NULL,
  aggregate_type TEXT NOT NULL,   -- 'task' | 'item' | 'project' | 'resource' | 'category' | 'balance_rule'
  event_type    TEXT NOT NULL,    -- 'TaskCreated' | 'ItemMarkedAvailable' | ...
  payload       JSONB NOT NULL,
  version       INT NOT NULL,     -- optimistic concurrency per aggregate
  created_at    TIMESTAMPTZ DEFAULT NOW()
)
```

### Commands → Events

**Category**
| Command | Event |
|---|---|
| CreateCategory | CategoryCreated |
| UpdateCategory | CategoryUpdated |
| DeleteCategory | CategoryDeleted |

**Task**
| Command | Event |
|---|---|
| CreateTask | TaskCreated |
| StartTask | TaskStarted |
| CompleteTask | TaskCompleted |
| PromoteToProject | TaskPromotedToProject |
| AddItemRequirement | ItemRequirementAdded |
| AttachResourceToTask | ResourceAttachedToTask |
| DetachResourceFromTask | ResourceDetachedFromTask |
| SetTaskRecurrence | TaskRecurrenceSet |
| SkipRecurrence | RecurrenceSkipped |
| ScheduleTask | TaskScheduled |

**Item**
| Command | Event |
|---|---|
| CreateItem | ItemCreated |
| MarkItemAvailable | ItemMarkedAvailable |
| MarkItemConsumed | ItemMarkedConsumed |
| MarkItemAvailableAgain | ItemMarkedAvailableAgain |

**Project**
| Command | Event |
|---|---|
| CreateProject | ProjectCreated |
| AddTaskToProject | TaskAddedToProject |
| CompleteProject | ProjectCompleted |

**Resource**
| Command | Event |
|---|---|
| CreateResource | ResourceCreated |
| UpdateResource | ResourceUpdated |
| DeleteResource | ResourceDeleted |

**BalanceRule**
| Command | Event |
|---|---|
| CreateBalanceRule | BalanceRuleCreated |
| UpdateBalanceRule | BalanceRuleUpdated |
| DeleteBalanceRule | BalanceRuleDeleted |

**System (emitted by projections, not user commands)**
| Trigger | Event |
|---|---|
| TaskCompleted on recurring task | TaskRescheduled |

---

## Read Model Projections

PostgreSQL tables rebuilt by replaying events:

| Projection | Key Fields |
|---|---|
| `tasks_view` | id, name, status (derived), categoryId, projectId, dueDate, scheduledDate, scheduledStartTime, estimatedDuration, recurrenceRule, nextDueDate, completionCount |
| `items_view` | id, name, status, categoryId, quantity |
| `task_items_view` | taskId, itemId, consumable, itemStatus |
| `projects_view` | id, name, status, categoryId, taskIds[] |
| `categories_view` | id, name, icon, color, isDefault, taskCount, itemCount |
| `resources_view` | id, title, type, url, notes, taskIds[] |
| `task_resources_view` | taskId, resourceId, title, type |
| `balance_rules_view` | id, categoryId, minimumCount, frequency, dayRestriction |
| `balance_status_view` | ruleId, categoryId, frequency, targetCount, actualCount, isMet, periodStart, periodEnd — `actualCount` is the count of `TaskCompleted` events for that category within the current period window |
| `dashboard_view` | readyCount, ongoingCount, pendingCount, plannedCount, toBuyCount |

---

## UI Structure

### Layout
Sidebar + Focus Dashboard (hybrid navigation):
- **Sidebar — By Status section**: Ready · Ongoing · Pending · Planned · To Buy · Available
- **Sidebar — By Category section**: user-defined categories + built-ins, with counts
- **Main area**: active view based on sidebar selection
- **Command bar** at top of main area: search, quick capture (⌘K)

### Screens

**1. Dashboard (home)**
- Command bar (`⌘K` — search or capture anything)
- Status summary cards: Ready / Ongoing / Pending / To Buy
- Life balance indicators: ✅ Study done · ❌ Health missing · ✅ Home this weekend
- Up Next list: top 5 ready tasks sorted by due date

**2. Tasks**
- Status tabs: Ready · Ongoing · Pending · Planned · Done
- Category filter dropdown
- Sort: due date / estimated duration / category
- Each row shows: name · category icon · duration · due date badge

**3. Items**
- Tabs: To Buy · Available · All
- Category filter
- Tap item → mark available / link to task / mark consumed

**4. Calendar**
- Views: Month · Week · Day (hourly slots)
- Planned and recurring tasks shown on their due dates
- Day view: drag tasks into hourly slots → fires `ScheduleTask` command
- Recurring task indicators (🔁)

**5. "What should I do?" (Suggestion Engine)**
- Input: available hours (slider or quick picks: 30m / 1h / 2h / 3h+)
- Optional: category filter
- Rule-based output: tasks where `status = ready` and either `estimatedDuration ≤ available time` or `estimatedDuration` is unset (treated as flexible / fits any slot)
- Balance-aware: unmet balance rules surface first (e.g. no study today → Study tasks ranked up)
- Sorted by: balance urgency → due date → duration fit

**6. Resources**
- Searchable library of all resources
- Filter by type (link / note / video / file / doc) and category
- Tap resource → view linked tasks / attach to another task

**7. Balance Rules**
- List of all balance rules with current period status
- Add / edit / delete rules
- Default rules (Health, Study, Home, Cars) shown but editable

---

## Key Flows

### 1. Create a task
Command bar → enter name → pick category → pick type (task / item to buy) → optional: add item requirements (buy or use available) → optional: set duration / due date / recurrence / resources → `CreateTask` fired → status auto-derived.

### 2. Item bought → task unblocks
Items view → To Buy tab → tap item → "Mark available" → `MarkItemAvailable` fired → projection re-evaluates all tasks requiring that item → tasks with all items now available flip to **Ready**.

### 3. Complete a recurring task
Mark task done → prompt per linked item ("Used up or still available?") → `TaskCompleted` + item events fired → if recurring: projection emits `TaskRescheduled` → task resets to **Planned** with `dueDate = now + recurrenceInterval` → `completionCount` increments.

### 4. Promote task → project
Open task detail → "Convert to project" → `PromoteToProject` fired → original task becomes first sub-task → project view opens → add additional tasks.

### 5. Schedule a task on the calendar
Calendar → Day view → drag task into hourly slot → `ScheduleTask { taskId, date, startTime }` fired → task appears on calendar at that time.

### 6. Morning Claude briefing
Scheduled Claude agent fires at 8am daily (configured via Claude Code `/schedule`) → calls MCP tools: `get_todays_schedule()`, `get_free_slots(date)`, `get_ready_tasks()`, `get_unmet_balance_rules()` → Claude reasons over data → delivers briefing: today's schedule + free slot suggestions + balance gaps + buy list reminders.

---

## MCP Server

Exposes read-only tools over the CQRS read models. Runs as a Node.js process alongside the backend.

| Tool | Description |
|---|---|
| `get_ready_tasks()` | All tasks with status = ready |
| `suggest_for_duration(hours)` | Ready tasks fitting within the given hours, balance-aware |
| `get_items_to_buy()` | All items with status = to_buy |
| `get_upcoming_due(days)` | Tasks due within N days |
| `get_category_summary()` | Per-category task and item counts |
| `get_todays_schedule()` | Tasks scheduled for today with start times |
| `get_free_slots(date)` | Unscheduled gaps in the day's hourly calendar |
| `get_balance_status()` | All balance rules with current period met/unmet status |
| `get_unmet_balance_rules()` | Only the rules not yet met for the current period |

---

## Out of Scope (Sub-projects 2 & 3)

- Shopping/procurement lists with vendor links and price tracking
- Weather-aware outdoor suggestions
- "Monthly place to go" recommendation (needs location + weather)
- Location-based context switching
- Study tracker with progress and streaks
- Smart context engine ("I want to go out — what does the weather say?")
