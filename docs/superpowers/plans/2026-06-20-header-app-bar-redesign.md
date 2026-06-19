# Header App Bar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app header into a 3-zone app bar — "Personal GTD" title on the left, search box centered, empty right placeholder — and remove the title from the Sidebar.

**Architecture:** All changes are pure layout. `App.tsx` owns the header composition; `Sidebar.tsx` drops its title NavLink. No new files, no logic changes, no API changes.

**Tech Stack:** React 18, React Router v6, Tailwind CSS

## Global Constraints

- No `any` types
- Named exports only — never `export default`
- `import type` for type-only imports
- `const` by default
- No new components — modify existing files only

---

### Task 1: Restructure header and remove Sidebar title

**Files:**
- Modify: `packages/frontend/src/App.tsx`
- Modify: `packages/frontend/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `TopBar` component (unchanged)
- Produces: 3-zone header layout visible on all pages; Sidebar starts with "By Status" section

No unit tests apply here — this is a pure layout change. Verification is visual via the dev server.

- [ ] **Step 1: Update `App.tsx` — add `Link` import and restructure the header**

Open `packages/frontend/src/App.tsx`. Change the import line and the `<header>` element:

```tsx
import React from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
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
    <div className="flex flex-col min-h-screen">
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
        <Link to="/" className="w-56 shrink-0 text-lg font-bold text-white">Personal GTD</Link>
        <div className="flex-1 flex justify-center">
          <TopBar />
        </div>
        <div className="w-56 shrink-0" />
      </header>
      <div className="flex flex-1 overflow-hidden">
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
    </div>
  );
}
```

- [ ] **Step 2: Update `Sidebar.tsx` — remove the "Personal GTD" NavLink**

Open `packages/frontend/src/components/layout/Sidebar.tsx`. Remove line 28 (the title NavLink). The `<aside>` body should start directly with the "By Status" label:

```tsx
  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col p-3 gap-1">
      <p className="text-xs uppercase text-gray-500 px-2 mb-1 mt-2">By Status</p>
      {statusLinks.map(l => (
```

All other Sidebar content is unchanged.

- [ ] **Step 3: Start the dev server and verify visually**

```bash
npm run dev:frontend
```

Open `http://localhost:5173` and confirm:
1. Header shows "Personal GTD" on the far left, search box centered, empty right zone
2. Clicking "Personal GTD" navigates to the dashboard (`/`)
3. Sidebar navigation starts with "BY STATUS" — no title at the top
4. Search box still works (type 2+ characters, dropdown appears)
5. Keyboard shortcut `Ctrl+K` still focuses the search input
6. Navigate to `/tasks`, `/items`, `/calendar` — header layout is consistent on all pages

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/App.tsx packages/frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: restructure header as 3-zone app bar, move title from sidebar"
```
