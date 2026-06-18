# Task Create & Edit Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal inline task creation form with a full-featured `/tasks/new` page, add inline item/resource creation to both create and edit task views, and unify the form logic into a shared `TaskForm` component.

**Architecture:** A new `TaskForm` component owns all field and item/resource UI state; it receives data and callbacks from parent pages and calls `onSubmit` with aggregated `TaskFormData`. `NewTask` orchestrates command dispatch on submit; `TaskDetail` becomes a thin wrapper that passes immediate-action callbacks for edit-mode item/resource management.

**Tech Stack:** React 18, TypeScript 5, TanStack Query v5, React Router v6, Tailwind CSS, Vite, uuid

## Global Constraints

- No `any` types — use `unknown` with guards or domain-specific types
- Named exports only — never `export default`
- `import type` for type-only imports
- Function declarations for named functions; arrow functions for callbacks
- `===` / `!==` always
- No comments unless the WHY is non-obvious
- Tailwind for all styling
- Test files use `.spec.ts` extension, co-located with source
- **Frontend has no component test infrastructure (no jsdom/testing-library).** Verification for each task is TypeScript compilation (`npx tsc --noEmit`) plus a manual browser smoke test.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/frontend/src/components/tasks/TaskForm.tsx` | **Create** | Shared form: all fields, items section, resources section |
| `packages/frontend/src/pages/NewTask.tsx` | **Create** | Create-mode page: fetches data, orchestrates commands, navigates |
| `packages/frontend/src/pages/TaskDetail.tsx` | **Modify** | Edit-mode wrapper: loads task, provides immediate-action callbacks |
| `packages/frontend/src/pages/Dashboard.tsx` | **Modify** | Remove `NewTaskRow`, navigate to `/tasks/new` |
| `packages/frontend/src/App.tsx` | **Modify** | Add `/tasks/new` route before `/tasks/:id` |

---

### Task 1: Create `TaskForm` component

**Files:**
- Create: `packages/frontend/src/components/tasks/TaskForm.tsx`

**Interfaces:**
- Consumes: `Task`, `Item`, `Category`, `Project`, `Resource` from `../../api/queries`
- Produces (exported from this file, consumed by Tasks 2 and 3):
  - `TaskFormData` — the shape passed to `onSubmit`
  - `ItemActions` — immediate edit-mode callbacks for item management
  - `ResourceActions` — immediate edit-mode callbacks for resource management
  - `TaskFormProps` — the component prop interface
  - `TaskForm` — the component

- [ ] **Step 1: Create the directory**

```bash
mkdir -p packages/frontend/src/components/tasks
```

- [ ] **Step 2: Write `TaskForm.tsx`**

Create `packages/frontend/src/components/tasks/TaskForm.tsx` with the following content:

```tsx
import React, { useState } from 'react';
import type { Task, Item, Category, Project, Resource } from '../../api/queries';

type ResourceType = 'link' | 'note' | 'video' | 'file' | 'doc';

interface PendingExistingItem { type: 'existing'; itemId: string; }
interface PendingNewItem { type: 'new'; name: string; categoryId: string; }
type PendingItem = PendingExistingItem | PendingNewItem;

interface PendingExistingResource { type: 'existing'; resourceId: string; }
interface PendingNewResource { type: 'new'; title: string; resourceType: ResourceType; url?: string; }
type PendingResource = PendingExistingResource | PendingNewResource;

export interface TaskFormData {
  name: string;
  description?: string;
  categoryId: string;
  projectId?: string;
  estimatedDuration?: { value: number; unit: 'hour' | 'day' };
  dueDate?: string;
  pendingItems: PendingItem[];
  pendingResources: PendingResource[];
}

export interface ItemActions {
  onAddExisting: (itemId: string) => Promise<void>;
  onAddNew: (name: string, categoryId: string) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

export interface ResourceActions {
  onAddExisting: (resourceId: string) => Promise<void>;
  onAddNew: (title: string, type: ResourceType, url?: string) => Promise<void>;
  onRemove: (resourceId: string) => Promise<void>;
}

export interface TaskFormProps {
  mode: 'create' | 'edit';
  task?: Task;
  categories: Category[];
  projects: Project[];
  allItems: Item[];
  allResources: Resource[];
  onSubmit: (data: TaskFormData) => Promise<void>;
  itemActions?: ItemActions;
  resourceActions?: ResourceActions;
}

const ITEM_STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  to_buy:    { label: 'To Buy',    emoji: '🛒', color: 'bg-yellow-900/40 text-yellow-300' },
  available: { label: 'Available', emoji: '✅', color: 'bg-green-900/40 text-green-300'  },
  consumed:  { label: 'Consumed',  emoji: '📦', color: 'bg-gray-700 text-gray-400'       },
};

const RESOURCE_TYPES: ResourceType[] = ['link', 'note', 'video', 'file', 'doc'];

export function TaskForm({
  mode, task, categories, projects, allItems, allResources, onSubmit, itemActions, resourceActions,
}: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [categoryId, setCategoryId] = useState(task?.category_id ?? categories[0]?.id ?? '');
  const [projectId, setProjectId] = useState(task?.project_id ?? '');
  const [durationValue, setDurationValue] = useState(String(task?.estimated_duration_value ?? ''));
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day'>((task?.estimated_duration_unit as 'hour' | 'day') ?? 'hour');
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? '');
  const [submitError, setSubmitError] = useState('');

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pendingResources, setPendingResources] = useState<PendingResource[]>([]);

  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState(categoryId);
  const [showNewResourceForm, setShowNewResourceForm] = useState(false);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<ResourceType>('link');
  const [newResourceUrl, setNewResourceUrl] = useState('');

  const editAttachedItems = mode === 'edit' ? (task?.required_items ?? []) : [];
  const takenItemIds = new Set([
    ...editAttachedItems.map(i => i.item_id),
    ...pendingItems.filter((p): p is PendingExistingItem => p.type === 'existing').map(p => p.itemId),
  ]);
  const unattachedItems = allItems.filter(i => !takenItemIds.has(i.id));

  const editAttachedResources = mode === 'edit' ? (task?.resources ?? []) : [];
  const takenResourceIds = new Set([
    ...editAttachedResources.map(r => r.resource_id),
    ...pendingResources.filter((p): p is PendingExistingResource => p.type === 'existing').map(p => p.resourceId),
  ]);
  const unattachedResources = allResources.filter(r => !takenResourceIds.has(r.id));

  const handleSubmit = async () => {
    setSubmitError('');
    try {
      await onSubmit({
        name: name.trim(),
        description: description || undefined,
        categoryId,
        projectId: projectId || undefined,
        estimatedDuration: durationValue ? { value: Number(durationValue), unit: durationUnit } : undefined,
        dueDate: dueDate || undefined,
        pendingItems,
        pendingResources,
      });
    } catch {
      setSubmitError('Failed to save task — please try again.');
    }
  };

  const handleAddExistingItem = async (itemId: string) => {
    if (mode === 'edit') {
      await itemActions?.onAddExisting(itemId);
    } else {
      setPendingItems(prev => [...prev, { type: 'existing', itemId }]);
    }
  };

  const handleAddNewItem = async () => {
    if (!newItemName.trim()) return;
    if (mode === 'edit') {
      await itemActions?.onAddNew(newItemName.trim(), newItemCategoryId);
    } else {
      setPendingItems(prev => [...prev, { type: 'new', name: newItemName.trim(), categoryId: newItemCategoryId }]);
    }
    setNewItemName('');
    setShowNewItemForm(false);
  };

  const handleRemoveItem = async (key: string) => {
    if (mode === 'edit') {
      await itemActions?.onRemove(key);
    } else {
      setPendingItems(prev => prev.filter(p =>
        p.type === 'existing' ? p.itemId !== key : p.name !== key
      ));
    }
  };

  const handleAddExistingResource = async (resourceId: string) => {
    if (mode === 'edit') {
      await resourceActions?.onAddExisting(resourceId);
    } else {
      setPendingResources(prev => [...prev, { type: 'existing', resourceId }]);
    }
  };

  const handleAddNewResource = async () => {
    if (!newResourceTitle.trim()) return;
    if (mode === 'edit') {
      await resourceActions?.onAddNew(newResourceTitle.trim(), newResourceType, newResourceUrl || undefined);
    } else {
      setPendingResources(prev => [...prev, {
        type: 'new', title: newResourceTitle.trim(), resourceType: newResourceType, url: newResourceUrl || undefined,
      }]);
    }
    setNewResourceTitle('');
    setNewResourceUrl('');
    setShowNewResourceForm(false);
  };

  const handleRemoveResource = async (key: string) => {
    if (mode === 'edit') {
      await resourceActions?.onRemove(key);
    } else {
      setPendingResources(prev => prev.filter(p =>
        p.type === 'existing' ? p.resourceId !== key : p.title !== key
      ));
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Detail fields */}
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
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

        <div className="flex items-center justify-between gap-3">
          {submitError && <p className="text-sm text-red-400">{submitError}</p>}
          <div className="ml-auto">
            <button type="button" onClick={handleSubmit} disabled={!name.trim() || !categoryId}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
              {mode === 'create' ? 'Create Task' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Items section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Items Required</h2>

        {mode === 'edit' && editAttachedItems.length === 0 && (
          <p className="text-sm text-gray-600">No items required.</p>
        )}
        {mode === 'create' && pendingItems.length === 0 && (
          <p className="text-sm text-gray-600">No items added yet.</p>
        )}

        {mode === 'edit' && editAttachedItems.map(ti => {
          const item = allItems.find(i => i.id === ti.item_id);
          const cfg = ITEM_STATUS_CONFIG[ti.item_status] ?? ITEM_STATUS_CONFIG['to_buy']!;
          return (
            <div key={ti.item_id} className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
              <span className="flex-1 text-sm text-white">{item?.name ?? ti.item_id}</span>
              <button type="button" onClick={() => void handleRemoveItem(ti.item_id)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        {mode === 'create' && pendingItems.map((p, i) => {
          const itemName = p.type === 'existing'
            ? (allItems.find(item => item.id === p.itemId)?.name ?? p.itemId)
            : p.name;
          const key = p.type === 'existing' ? p.itemId : p.name;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-400 italic">• {itemName}</span>
              <button type="button" onClick={() => void handleRemoveItem(key)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        <select disabled={unattachedItems.length === 0} defaultValue=""
          onChange={e => { if (e.target.value) { void handleAddExistingItem(e.target.value); e.currentTarget.value = ''; } }}
          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700 disabled:opacity-40">
          <option value="">{unattachedItems.length === 0 ? 'No items available' : '+ Add existing item…'}</option>
          {unattachedItems.map(i => {
            const cfg = ITEM_STATUS_CONFIG[i.status] ?? ITEM_STATUS_CONFIG['to_buy']!;
            return <option key={i.id} value={i.id}>{cfg.emoji} {i.name}</option>;
          })}
        </select>

        {!showNewItemForm && (
          <button type="button" onClick={() => { setShowNewItemForm(true); setNewItemCategoryId(categoryId); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 text-left">
            + New item
          </button>
        )}

        {showNewItemForm && (
          <div className="flex gap-2 items-center flex-wrap">
            <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
              placeholder="Item name..." autoFocus
              className="flex-1 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700" />
            <select value={newItemCategoryId} onChange={e => setNewItemCategoryId(e.target.value)}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <button type="button" onClick={() => void handleAddNewItem()} disabled={!newItemName.trim()}
              className="px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
              Add
            </button>
            <button type="button" onClick={() => { setShowNewItemForm(false); setNewItemName(''); }}
              className="text-xs text-gray-500 hover:text-white">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Resources section */}
      <div className="flex flex-col gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">Resources</h2>

        {mode === 'edit' && editAttachedResources.length === 0 && (
          <p className="text-sm text-gray-600">No resources attached.</p>
        )}
        {mode === 'create' && pendingResources.length === 0 && (
          <p className="text-sm text-gray-600">No resources added yet.</p>
        )}

        {mode === 'edit' && editAttachedResources.map(r => (
          <div key={r.resource_id} className="flex items-center gap-2">
            <span className="flex-1 text-sm text-white">{r.title}</span>
            <button type="button" onClick={() => void handleRemoveResource(r.resource_id)}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
          </div>
        ))}

        {mode === 'create' && pendingResources.map((p, i) => {
          const resourceTitle = p.type === 'existing'
            ? (allResources.find(r => r.id === p.resourceId)?.title ?? p.resourceId)
            : p.title;
          const key = p.type === 'existing' ? p.resourceId : p.title;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-gray-400 italic">• {resourceTitle}</span>
              <button type="button" onClick={() => void handleRemoveResource(key)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">✕</button>
            </div>
          );
        })}

        <select disabled={unattachedResources.length === 0} defaultValue=""
          onChange={e => { if (e.target.value) { void handleAddExistingResource(e.target.value); e.currentTarget.value = ''; } }}
          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700 disabled:opacity-40">
          <option value="">{unattachedResources.length === 0 ? 'No resources available' : '+ Add existing resource…'}</option>
          {unattachedResources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>

        {!showNewResourceForm && (
          <button type="button" onClick={() => setShowNewResourceForm(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 text-left">
            + New resource
          </button>
        )}

        {showNewResourceForm && (
          <div className="flex gap-2 items-center flex-wrap">
            <input value={newResourceTitle} onChange={e => setNewResourceTitle(e.target.value)}
              placeholder="Title..." autoFocus
              className="flex-1 min-w-32 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700" />
            <select value={newResourceType} onChange={e => setNewResourceType(e.target.value as ResourceType)}
              className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700">
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {newResourceType === 'link' && (
              <input value={newResourceUrl} onChange={e => setNewResourceUrl(e.target.value)} placeholder="URL..."
                className="flex-1 min-w-48 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-gray-700" />
            )}
            <button type="button" onClick={() => void handleAddNewResource()} disabled={!newResourceTitle.trim()}
              className="px-2 py-1.5 text-xs bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
              Add
            </button>
            <button type="button" onClick={() => { setShowNewResourceForm(false); setNewResourceTitle(''); setNewResourceUrl(''); }}
              className="text-xs text-gray-500 hover:text-white">
              Cancel
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd packages/frontend && npx tsc --noEmit
```

Expected: no errors. The component has no callers yet — that is expected at this stage.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/components/tasks/TaskForm.tsx
git commit -m "feat(frontend): add shared TaskForm component with inline item/resource creation"
```

---

### Task 2: Create `NewTask` page and wire up routing

**Files:**
- Create: `packages/frontend/src/pages/NewTask.tsx`
- Modify: `packages/frontend/src/App.tsx`

**Interfaces:**
- Consumes: `TaskForm`, `TaskFormData` from `../components/tasks/TaskForm` (produced by Task 1)
- Consumes: `useCategories`, `useProjects`, `useItems`, `useResources` from `../api/queries`
- Consumes: `dispatch` from `../api/commands`
- Produces: the `/tasks/new` route

- [ ] **Step 1: Create `NewTask.tsx`**

Create `packages/frontend/src/pages/NewTask.tsx` with this content:

```tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useProjects, useItems, useResources } from '../api/queries';
import { dispatch } from '../api/commands';
import { TaskForm } from '../components/tasks/TaskForm';
import type { TaskFormData } from '../components/tasks/TaskForm';

export function NewTask() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();

  if (!categories) return <div className="text-gray-500 text-sm">Loading...</div>;

  const handleSubmit = async (data: TaskFormData) => {
    const taskId = uuidv4();

    await dispatch('CreateTaskCommand', {
      id: taskId,
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      projectId: data.projectId,
      estimatedDuration: data.estimatedDuration as Record<string, unknown> | undefined,
      dueDate: data.dueDate,
    });

    try {
      for (const pending of data.pendingItems) {
        if (pending.type === 'new') {
          const itemId = uuidv4();
          await dispatch('CreateItemCommand', { id: itemId, name: pending.name, categoryId: pending.categoryId });
          await dispatch('AddItemRequirementCommand', { taskId, itemId, consumable: true });
        } else {
          await dispatch('AddItemRequirementCommand', { taskId, itemId: pending.itemId, consumable: true });
        }
      }
      for (const pending of data.pendingResources) {
        if (pending.type === 'new') {
          const resourceId = uuidv4();
          await dispatch('CreateResourceCommand', { id: resourceId, title: pending.title, type: pending.resourceType, url: pending.url });
          await dispatch('AttachResourceToTaskCommand', { taskId, resourceId });
        } else {
          await dispatch('AttachResourceToTaskCommand', { taskId, resourceId: pending.resourceId });
        }
      }
    } catch (err) {
      console.error('Failed to attach items/resources after task creation:', err);
    }

    await qc.invalidateQueries();
    navigate(`/tasks/${taskId}`);
  };

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/tasks" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Tasks</Link>
      </div>
      <TaskForm
        mode="create"
        categories={categories}
        projects={projects ?? []}
        allItems={allItems ?? []}
        allResources={allResources ?? []}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add the route to `App.tsx`**

In `packages/frontend/src/App.tsx`:

Add import after the `TaskDetail` import line:
```tsx
import { NewTask } from './pages/NewTask';
```

Add the route **before** the `/tasks/:id` route (order matters — React Router matches top-to-bottom and `new` would otherwise be treated as an `:id`):
```tsx
          <Route path="/tasks/new" element={<NewTask />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
```

The complete updated `App.tsx`:
```tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { TaskDetail } from './pages/TaskDetail';
import { NewTask } from './pages/NewTask';
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
          <Route path="/tasks/new" element={<NewTask />} />
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

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd packages/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Manual smoke test**

Start the dev servers:
```bash
# Terminal 1
npm run dev:backend
# Terminal 2
npm run dev:frontend
```

Navigate to `http://localhost:5173/tasks/new`. Verify:
- Page loads with back link, all detail fields, items section, resources section
- "Create Task" button is disabled until name is filled
- "+ New item" expands inline form; adding an item shows it in italic in the list with ×
- "+ New resource" expands inline form; type dropdown changes to show URL field for "link" type
- Filling name + category and clicking "Create Task" creates the task and redirects to `/tasks/<new-id>`

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/pages/NewTask.tsx packages/frontend/src/App.tsx
git commit -m "feat(frontend): add /tasks/new page and route for full-featured task creation"
```

---

### Task 3: Refactor `TaskDetail` to use `TaskForm`

**Files:**
- Modify: `packages/frontend/src/pages/TaskDetail.tsx`

**Interfaces:**
- Consumes: `TaskForm`, `TaskFormData`, `ItemActions`, `ResourceActions` from `../components/tasks/TaskForm` (produced by Task 1)
- In edit mode `onSubmit`, `pendingItems` and `pendingResources` in `TaskFormData` are always empty — edit-mode item/resource changes are dispatched immediately via `itemActions`/`resourceActions`

- [ ] **Step 1: Replace `TaskDetail.tsx` with the thin-wrapper version**

Replace the entire content of `packages/frontend/src/pages/TaskDetail.tsx`:

```tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useTask, useCategories, useProjects, useItems, useResources } from '../api/queries';
import { dispatch } from '../api/commands';
import { TaskForm } from '../components/tasks/TaskForm';
import type { TaskFormData, ItemActions, ResourceActions } from '../components/tasks/TaskForm';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: task, isLoading } = useTask(id!);
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();
  const { data: allItems } = useItems();
  const { data: allResources } = useResources();

  if (isLoading || !task || !categories) {
    return <div className="text-gray-500 text-sm">Loading...</div>;
  }

  const handleSave = async (data: TaskFormData) => {
    if (data.projectId && data.projectId !== task.project_id) {
      await dispatch('AddTaskToProjectCommand', { projectId: data.projectId, taskId: task.id });
    }
    await dispatch('UpdateTaskCommand', {
      id: task.id,
      name: data.name,
      categoryId: data.categoryId,
      description: data.description,
      estimatedDuration: data.estimatedDuration as Record<string, unknown> | undefined,
      dueDate: data.dueDate,
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

  const itemActions: ItemActions = {
    onAddExisting: async (itemId) => {
      await dispatch('AddItemRequirementCommand', { taskId: task.id, itemId, consumable: true });
      await qc.invalidateQueries();
    },
    onAddNew: async (name, categoryId) => {
      const itemId = uuidv4();
      await dispatch('CreateItemCommand', { id: itemId, name, categoryId });
      await dispatch('AddItemRequirementCommand', { taskId: task.id, itemId, consumable: true });
      await qc.invalidateQueries();
    },
    onRemove: async (itemId) => {
      await dispatch('RemoveItemRequirementCommand', { taskId: task.id, itemId });
      await qc.invalidateQueries();
    },
  };

  const resourceActions: ResourceActions = {
    onAddExisting: async (resourceId) => {
      await dispatch('AttachResourceToTaskCommand', { taskId: task.id, resourceId });
      await qc.invalidateQueries();
    },
    onAddNew: async (title, type, url) => {
      const resourceId = uuidv4();
      await dispatch('CreateResourceCommand', { id: resourceId, title, type, url });
      await dispatch('AttachResourceToTaskCommand', { taskId: task.id, resourceId });
      await qc.invalidateQueries();
    },
    onRemove: async (resourceId) => {
      await dispatch('DetachResourceFromTaskCommand', { taskId: task.id, resourceId });
      await qc.invalidateQueries();
    },
  };

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/tasks" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Tasks</Link>
      </div>

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

      <TaskForm
        mode="edit"
        task={task}
        categories={categories}
        projects={projects ?? []}
        allItems={allItems ?? []}
        allResources={allResources ?? []}
        onSubmit={handleSave}
        itemActions={itemActions}
        resourceActions={resourceActions}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd packages/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Manual smoke test**

Navigate to an existing task (e.g. `http://localhost:5173/tasks/<some-uuid>`). Verify:
- All fields pre-populate with the task's saved values
- "Save" button updates the task (name, description, category, project, duration, due date)
- Items section shows attached items with status badges and ✕ buttons
- "No items available" shows in the dropdown when all items are attached
- "+ New item" expands the inline form; submitting creates the item and attaches it immediately (the new item appears in the list)
- ✕ on an attached item removes it immediately
- Same smoke test for resources
- "Start" / "Complete" buttons appear for ready / ongoing tasks

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/TaskDetail.tsx
git commit -m "refactor(frontend): TaskDetail becomes thin wrapper using shared TaskForm"
```

---

### Task 4: Update Dashboard to navigate to `/tasks/new`

**Files:**
- Modify: `packages/frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- No new interfaces

- [ ] **Step 1: Remove `NewTaskRow` and update the `+ Add Task` button**

In `packages/frontend/src/pages/Dashboard.tsx`, make the following changes:

1. Add `useNavigate` to the react-router-dom import:
```tsx
import { Link, useNavigate } from 'react-router-dom';
```

2. Delete the entire `NewTaskRow` function (the block from `function NewTaskRow` through its closing `}`).

3. In the `Dashboard` function body, add `useNavigate` after the existing hooks and remove the `addingTask` state:

Remove:
```tsx
  const [addingTask, setAddingTask] = useState(false);
```

Add (after the existing `const { data: projects }` line):
```tsx
  const navigate = useNavigate();
```

4. In the "Up Next" section header, replace:
```tsx
            {!addingTask && (
              <button
                type="button"
                onClick={() => setAddingTask(true)}
                className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                + Add Task
              </button>
            )}
```
with:
```tsx
              <button
                type="button"
                onClick={() => navigate('/tasks/new')}
                className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                + Add Task
              </button>
```

5. In the tasks list, remove:
```tsx
            {addingTask && <NewTaskRow onDone={() => setAddingTask(false)} />}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd packages/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Manual smoke test**

On the Dashboard (`http://localhost:5173/`), click "+ Add Task". Verify it navigates to `/tasks/new`. Verify the Dashboard no longer shows an inline form.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Dashboard.tsx
git commit -m "feat(frontend): Dashboard add-task navigates to /tasks/new"
```

---

## Completion Checklist

After all four tasks are committed, do a final end-to-end pass:

- [ ] Creating a task from Dashboard → `/tasks/new` → fills all fields → adds inline items and resources → "Create Task" → lands on task detail
- [ ] Creating a task from `/tasks/new` with no items/resources creates cleanly
- [ ] Editing an existing task: all fields editable, Save works
- [ ] Adding an existing item in edit mode attaches it immediately
- [ ] Creating a new item in edit mode (via "+ New item") creates and attaches immediately
- [ ] Removing an item (✕) in edit mode removes immediately
- [ ] Same three checks for resources
- [ ] "No items available" appears when the dropdown has nothing to offer
- [ ] TypeScript build passes: `cd packages/frontend && npx tsc --noEmit`
