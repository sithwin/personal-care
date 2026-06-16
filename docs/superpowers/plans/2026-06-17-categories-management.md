# Categories Management Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/categories` page where users can create, edit, and delete categories from within the app.

**Architecture:** Single new file `packages/frontend/src/pages/Categories.tsx` containing three local components (`Categories`, `CategoryRow`, `NewCategoryRow`). Wire into the existing React Router setup in `App.tsx` and add a sidebar nav link — no backend changes.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS, TanStack Query (`useQueryClient`), `uuid` (`v4 as uuidv4`), React Router `NavLink`.

## Global Constraints

- No new dependencies — `uuid` is already installed (used in `CommandBar.tsx`)
- Follow existing Tailwind dark-theme patterns: `bg-gray-900`, `border-gray-800`, `text-white`, `text-gray-400`
- Named exports only — never `export default`
- `import type` for type-only imports
- No `any` types
- `const` by default, `let` when reassignment is needed
- No `.test.ts` files — no spec files needed for this feature (all backend coverage already exists)

---

## File Map

| File | Change |
|------|--------|
| `packages/frontend/src/pages/Categories.tsx` | **Create** — full page with `CategoryRow` and `NewCategoryRow` |
| `packages/frontend/src/App.tsx` | **Modify** — add `/categories` route |
| `packages/frontend/src/components/layout/Sidebar.tsx` | **Modify** — add `🏷 Categories` bottom nav link |

---

### Task 1: Create the Categories page

**Files:**
- Create: `packages/frontend/src/pages/Categories.tsx`

**Interfaces:**
- Consumes: `useCategories()` and `Category` from `../../api/queries`; `dispatch` from `../../api/commands`; `useQueryClient` from `@tanstack/react-query`; `v4 as uuidv4` from `uuid`
- Produces: exported `Categories` function component (used by Task 2)

---

- [ ] **Step 1: Create the file with constants**

Create `packages/frontend/src/pages/Categories.tsx` with the shared emoji and color data:

```tsx
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Category } from '../api/queries';
import { useCategories } from '../api/queries';
import { dispatch } from '../api/commands';
import { v4 as uuidv4 } from 'uuid';

const EMOJIS = ['💪','🏃','🧘','🛁','💊','🥗','📚','🎯','🏠','🌿','💤','🧹','🛒','🔧','🎨','🎵','💻','📝','🧠','💡','🌟','⚡','🔑','📅'];
const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280'];
```

- [ ] **Step 2: Add the EmojiGrid sub-component**

Append to the file (above the exported components):

```tsx
interface EmojiGridProps { value: string; onChange: (emoji: string) => void; }

function EmojiGrid({ value, onChange }: EmojiGridProps) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {EMOJIS.map(e => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={`text-lg p-1 rounded hover:bg-gray-700 transition-colors ${value === e ? 'ring-2 ring-indigo-500 bg-gray-700' : ''}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Add the ColorPicker sub-component**

Append to the file:

```tsx
interface ColorPickerProps { value: string; onChange: (color: string) => void; }

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-indigo-500' : ''}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add the CategoryRow component**

Append to the file:

```tsx
interface CategoryRowProps { category: Category; }

function CategoryRow({ category }: CategoryRowProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [icon, setIcon] = useState(category.icon);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);

  const canDelete = category.task_count === 0 && category.item_count === 0;

  const handleSave = async () => {
    await dispatch('UpdateCategoryCommand', { id: category.id, name, icon, color });
    await qc.invalidateQueries();
    setEditing(false);
  };

  const handleCancel = () => {
    setIcon(category.icon);
    setName(category.name);
    setColor(category.color);
    setEditing(false);
  };

  const handleDelete = async () => {
    await dispatch('DeleteCategoryCommand', { id: category.id });
    await qc.invalidateQueries();
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-3 px-4 py-3 bg-gray-900 border border-indigo-700 rounded-lg">
        <EmojiGrid value={icon} onChange={setIcon} />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Category name..."
          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500"
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <span className="text-xl">{category.icon}</span>
      <span className="flex-1 text-sm text-white">{category.name}</span>
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
      {category.task_count > 0 && (
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{category.task_count} tasks</span>
      )}
      {category.item_count > 0 && (
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{category.item_count} items</span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={!canDelete}
        title={!canDelete ? 'Reassign or remove all tasks and items first' : undefined}
        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Delete
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Add the NewCategoryRow component**

Append to the file:

```tsx
interface NewCategoryRowProps { onDone: () => void; }

function NewCategoryRow({ onDone }: NewCategoryRowProps) {
  const qc = useQueryClient();
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleSave = async () => {
    await dispatch('CreateCategoryCommand', { id: uuidv4(), name, icon, color, isDefault: false });
    await qc.invalidateQueries();
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 bg-gray-900 border border-indigo-700 border-dashed rounded-lg">
      <EmojiGrid value={icon} onChange={setIcon} />
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Category name..."
        autoFocus
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500"
        >
          Create
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the page root component**

Append to the file:

```tsx
export function Categories() {
  const { data: categories, isLoading } = useCategories();
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Categories</h1>
        <p className="text-sm text-gray-500">Organise your tasks and items by life area.</p>
      </div>
      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      <div className="flex flex-col gap-2">
        {categories?.map(cat => <CategoryRow key={cat.id} category={cat} />)}
        {addingNew && <NewCategoryRow onDone={() => setAddingNew(false)} />}
      </div>
      {!addingNew && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="self-start px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
        >
          + Add Category
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Verify the file compiles**

Run from repo root:
```bash
npx tsc --noEmit -p packages/frontend/tsconfig.json
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/frontend/src/pages/Categories.tsx
git commit -m "feat: add Categories management page with inline create/edit/delete"
```

---

### Task 2: Wire up routing and navigation

**Files:**
- Modify: `packages/frontend/src/App.tsx`
- Modify: `packages/frontend/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `Categories` exported from `./pages/Categories` (Task 1)
- Produces: `/categories` route navigable from the sidebar

---

- [ ] **Step 1: Add the route in App.tsx**

Open `packages/frontend/src/App.tsx`. Add the import after the existing page imports:

```tsx
import { Categories } from './pages/Categories';
```

Add the route inside `<Routes>`, after the `/balance` route:

```tsx
<Route path="/categories" element={<Categories />} />
```

The full `<Routes>` block should look like:
```tsx
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/tasks" element={<Tasks />} />
  <Route path="/items" element={<Items />} />
  <Route path="/calendar" element={<Calendar />} />
  <Route path="/suggest" element={<Suggest />} />
  <Route path="/resources" element={<Resources />} />
  <Route path="/balance" element={<BalanceRules />} />
  <Route path="/categories" element={<Categories />} />
</Routes>
```

- [ ] **Step 2: Add the sidebar link in Sidebar.tsx**

Open `packages/frontend/src/components/layout/Sidebar.tsx`. In the bottom `<div>` (the one with `mt-auto`), add a `NavLink` for Categories after the Balance link:

```tsx
<NavLink to="/categories" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>🏷 Categories</NavLink>
```

The full bottom `<div>` should look like:
```tsx
<div className="mt-auto flex flex-col gap-1 pt-4 border-t border-gray-800">
  <NavLink to="/calendar" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>📅 Calendar</NavLink>
  <NavLink to="/suggest" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>⚡ Suggest</NavLink>
  <NavLink to="/resources" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>🔗 Resources</NavLink>
  <NavLink to="/balance" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>⚖️ Balance</NavLink>
  <NavLink to="/categories" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>🏷 Categories</NavLink>
</div>
```

- [ ] **Step 3: Verify the file compiles**

```bash
npx tsc --noEmit -p packages/frontend/tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the dev servers:
```bash
npm run dev:backend   # terminal 1
npm run dev:frontend  # terminal 2
```

Then verify:
1. Sidebar shows `🏷 Categories` link at the bottom — click it, page loads at `/categories`
2. Click `+ Add Category` — `NewCategoryRow` appears with emoji grid, name input, color picker
3. Select an emoji and color, type a name, click `Create` — category appears in the list AND in the sidebar "By Category" section AND in the CommandBar dropdown
4. Click `Edit` on a category — row expands showing current values pre-filled; change name/icon/color and click `Save` — view mode shows updated values
5. Click `Cancel` on an edit — values revert with no change
6. Create a task assigned to a category, then return to Categories — `Delete` button on that category is disabled, hover shows tooltip `"Reassign or remove all tasks and items first"`
7. Delete a category with no tasks or items — row disappears, sidebar updates

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/App.tsx packages/frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: wire /categories route and sidebar link"
```
