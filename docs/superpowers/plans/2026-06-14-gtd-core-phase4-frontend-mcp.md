# GTD Core — Phase 4: Frontend & MCP Server

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** React frontend with 7 screens (Dashboard, Tasks, Items, Calendar, Suggest, Resources, BalanceRules) + sidebar layout + command bar. Then the MCP server with 9 tools for Claude Desktop integration.

**Architecture:** Vite + React 18 + TypeScript. TanStack Query for server state. React Router for page routing. Tailwind CSS for styling. FullCalendar for the calendar screen. All data fetched from `http://localhost:3001`. Commands dispatched via `POST /commands/:type`.

**Prerequisite:** Phases 1–3 complete. Backend running on port 3001.

---

### Task 18: Frontend scaffold + Tailwind

**Files:**
- Create: `packages/frontend/index.html`
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/tailwind.config.js`
- Create: `packages/frontend/postcss.config.js`
- Create: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/index.css`

- [x] **Step 1: Create `packages/frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Personal GTD</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 2: Create `packages/frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3001', rewrite: (path) => path.replace(/^\/api/, '') } },
  },
});
```

- [x] **Step 3: Create `packages/frontend/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [x] **Step 4: Create `packages/frontend/postcss.config.js`**

```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [x] **Step 5: Create `packages/frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-gray-950 text-gray-100 font-sans; }
```

- [x] **Step 6: Create `packages/frontend/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [x] **Step 7: Install frontend dependencies**

```bash
cd packages/frontend && npm install
```

- [x] **Step 8: Commit**

```bash
git add packages/frontend/
git commit -m "feat: frontend scaffold with Vite, React, Tailwind"
```

---

### Task 19: API client + hooks

**Files:**
- Create: `packages/frontend/src/api/client.ts`
- Create: `packages/frontend/src/api/commands.ts`
- Create: `packages/frontend/src/api/queries.ts`

- [x] **Step 1: Write `packages/frontend/src/api/client.ts`**

```typescript
const BASE = '/api';

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
```

- [x] **Step 2: Write `packages/frontend/src/api/commands.ts`**

```typescript
import { fetchJSON } from './client';

interface CommandResult { events: Array<{ id: number; eventType: string; aggregateId: string }>; }

export async function dispatch(type: string, payload: Record<string, unknown>): Promise<CommandResult> {
  return fetchJSON<CommandResult>(`/commands/${type}`, { method: 'POST', body: JSON.stringify(payload) });
}
```

- [x] **Step 3: Write `packages/frontend/src/api/queries.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchJSON } from './client';

export interface Task {
  id: string; name: string; description?: string; category_id: string; project_id?: string;
  status: 'ready' | 'ongoing' | 'pending' | 'planned' | 'done';
  estimated_duration_value?: number; estimated_duration_unit?: string;
  due_date?: string; scheduled_date?: string; scheduled_start_time?: string;
  recurrence_rule?: { interval: number; unit: string };
  completion_count: number; required_items?: unknown[]; resources?: unknown[];
}

export interface Item {
  id: string; name: string; description?: string; category_id: string;
  status: 'to_buy' | 'available' | 'consumed'; quantity?: number; price?: number; notes?: string;
}

export interface Category {
  id: string; name: string; icon: string; color: string; is_default: boolean;
  task_count: number; item_count: number;
}

export interface Project {
  id: string; name: string; description?: string; category_id: string;
  status: 'active' | 'on_hold' | 'done'; due_date?: string; task_ids: string[];
}

export interface Resource {
  id: string; title: string; type: string; url?: string; notes?: string;
  category_id?: string; task_ids: string[];
}

export interface BalanceStatus {
  rule_id: string; category_id: string; frequency: string;
  target_count: number; actual_count: number; is_met: boolean;
  category_name: string; category_icon: string;
}

export interface Dashboard {
  counts: { ready_count: number; ongoing_count: number; pending_count: number; planned_count: number; to_buy_count: number };
  balanceStatus: BalanceStatus[];
  upNext: Task[];
}

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => fetchJSON<Dashboard>('/dashboard') });
export const useTasks = (params?: Record<string, string>) => useQuery({ queryKey: ['tasks', params], queryFn: () => fetchJSON<Task[]>(`/tasks?${new URLSearchParams(params)}`) });
export const useTask = (id: string) => useQuery({ queryKey: ['tasks', id], queryFn: () => fetchJSON<Task>(`/tasks/${id}`) });
export const useItems = (params?: Record<string, string>) => useQuery({ queryKey: ['items', params], queryFn: () => fetchJSON<Item[]>(`/items?${new URLSearchParams(params)}`) });
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => fetchJSON<Category[]>('/categories') });
export const useProjects = (params?: Record<string, string>) => useQuery({ queryKey: ['projects', params], queryFn: () => fetchJSON<Project[]>(`/projects?${new URLSearchParams(params)}`) });
export const useResources = (params?: Record<string, string>) => useQuery({ queryKey: ['resources', params], queryFn: () => fetchJSON<Resource[]>(`/resources?${new URLSearchParams(params)}`) });
export const useBalanceStatus = () => useQuery({ queryKey: ['balance', 'status'], queryFn: () => fetchJSON<BalanceStatus[]>('/balance/status') });
export const useBalanceRules = () => useQuery({ queryKey: ['balance', 'rules'], queryFn: () => fetchJSON<unknown[]>('/balance/rules') });
export const useSuggestions = (hours: number, categoryId?: string) => useQuery({
  queryKey: ['suggest', hours, categoryId],
  queryFn: () => {
    const p = new URLSearchParams({ hours: String(hours) });
    if (categoryId) p.set('categoryId', categoryId);
    return fetchJSON<Task[]>(`/suggest?${p}`);
  },
  enabled: hours > 0,
});
```

- [x] **Step 4: Commit**

```bash
git add packages/frontend/src/api/
git commit -m "feat: frontend API client, command dispatcher, and query hooks"
```

---

### Task 20: App shell + Sidebar

**Files:**
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/components/layout/Sidebar.tsx`
- Create: `packages/frontend/src/components/layout/CommandBar.tsx`

- [x] **Step 1: Write `packages/frontend/src/components/layout/Sidebar.tsx`**

```tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCategories, useDashboard } from '../../api/queries';

const statusLinks = [
  { to: '/tasks?status=ready', label: 'Ready', icon: '⚡', key: 'ready' },
  { to: '/tasks?status=ongoing', label: 'Ongoing', icon: '▶', key: 'ongoing' },
  { to: '/tasks?status=pending', label: 'Pending', icon: '⏸', key: 'pending' },
  { to: '/tasks?status=planned', label: 'Planned', icon: '📅', key: 'planned' },
  { to: '/items?status=to_buy', label: 'To Buy', icon: '🛒', key: 'to_buy' },
  { to: '/items?status=available', label: 'Available', icon: '✅', key: 'available' },
];

export function Sidebar() {
  const { data: categories } = useCategories();
  const { data: dashboard } = useDashboard();

  const counts: Record<string, number> = {
    ready: dashboard?.counts.ready_count ?? 0,
    ongoing: dashboard?.counts.ongoing_count ?? 0,
    pending: dashboard?.counts.pending_count ?? 0,
    planned: dashboard?.counts.planned_count ?? 0,
    to_buy: dashboard?.counts.to_buy_count ?? 0,
  };

  return (
    <aside className="w-56 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col p-3 gap-1">
      <NavLink to="/" className="text-lg font-bold text-white px-2 py-3 mb-2">Personal GTD</NavLink>

      <p className="text-xs uppercase text-gray-500 px-2 mb-1 mt-2">By Status</p>
      {statusLinks.map(l => (
        <NavLink key={l.key} to={l.to}
          className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
          <span>{l.icon}</span>
          <span className="flex-1">{l.label}</span>
          {counts[l.key] > 0 && <span className="text-xs text-gray-500">{counts[l.key]}</span>}
        </NavLink>
      ))}

      <p className="text-xs uppercase text-gray-500 px-2 mb-1 mt-4">By Category</p>
      {categories?.map(cat => (
        <NavLink key={cat.id} to={`/tasks?categoryId=${cat.id}`}
          className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
          <span>{cat.icon}</span>
          <span className="flex-1">{cat.name}</span>
          {cat.task_count > 0 && <span className="text-xs text-gray-500">{cat.task_count}</span>}
        </NavLink>
      ))}

      <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-gray-800">
        <NavLink to="/calendar" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>📅 Calendar</NavLink>
        <NavLink to="/suggest" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>⚡ Suggest</NavLink>
        <NavLink to="/resources" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>🔗 Resources</NavLink>
        <NavLink to="/balance" className={({ isActive }) => `flex items-center gap-2 px-2 py-1.5 rounded text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>⚖️ Balance</NavLink>
      </div>
    </aside>
  );
}
```

- [x] **Step 2: Write `packages/frontend/src/components/layout/CommandBar.tsx`**

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { dispatch } from '../../api/commands';
import { useCategories } from '../../api/queries';
import { v4 as uuidv4 } from 'uuid';

interface Props { placeholder?: string; }

export function CommandBar({ placeholder = '⌘  Search or capture anything...' }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { data: categories } = useCategories();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !categoryId) return;
    await dispatch('CreateTask', { id: uuidv4(), name: value.trim(), categoryId });
    await qc.invalidateQueries();
    setValue('');
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 transition-colors border border-gray-700">
        {placeholder}
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-gray-900 rounded-xl border border-gray-700 shadow-2xl p-4 flex flex-col gap-3">
            <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
              placeholder="Task name..."
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700 focus:border-indigo-500" />
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none border border-gray-700">
              <option value="">Select category...</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={!value.trim() || !categoryId}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-500">
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
```

- [x] **Step 3: Write `packages/frontend/src/App.tsx`**

```tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Items } from './pages/Items';
import { Calendar } from './pages/Calendar';
import { Suggest } from './pages/Suggest';
import { Resources } from './pages/Resources';
import { BalanceRules } from './pages/BalanceRules';

export function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/items" element={<Items />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/suggest" element={<Suggest />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/balance" element={<BalanceRules />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add packages/frontend/src/App.tsx packages/frontend/src/components/
git commit -m "feat: App shell, Sidebar navigation, CommandBar (⌘K)"
```

---

### Task 21: Dashboard, Tasks, Items pages

**Files:**
- Create: `packages/frontend/src/pages/Dashboard.tsx`
- Create: `packages/frontend/src/pages/Tasks.tsx`
- Create: `packages/frontend/src/pages/Items.tsx`

- [x] **Step 1: Write `packages/frontend/src/pages/Dashboard.tsx`**

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../api/queries';
import { CommandBar } from '../components/layout/CommandBar';

export function Dashboard() {
  const { data, isLoading } = useDashboard();
  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  const c = data?.counts;
  const cards = [
    { label: 'Ready', value: c?.ready_count ?? 0, to: '/tasks?status=ready', color: 'text-green-400' },
    { label: 'Ongoing', value: c?.ongoing_count ?? 0, to: '/tasks?status=ongoing', color: 'text-blue-400' },
    { label: 'Pending', value: c?.pending_count ?? 0, to: '/tasks?status=pending', color: 'text-yellow-400' },
    { label: 'To Buy', value: c?.to_buy_count ?? 0, to: '/items?status=to_buy', color: 'text-orange-400' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <CommandBar />

      <div className="grid grid-cols-4 gap-4">
        {cards.map(card => (
          <Link key={card.label} to={card.to} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      {(data?.balanceStatus?.length ?? 0) > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Life Balance</h2>
          <div className="flex flex-wrap gap-2">
            {data!.balanceStatus.map(b => (
              <span key={b.rule_id} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${b.is_met ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                {b.is_met ? '✅' : '❌'} {b.category_icon} {b.category_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {(data?.upNext?.length ?? 0) > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Up Next</h2>
          <div className="flex flex-col gap-2">
            {data!.upNext.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-3 py-2 bg-gray-800 rounded-lg text-sm">
                <span className="text-gray-400">☐</span>
                <span className="flex-1 text-white">{task.name}</span>
                {task.estimated_duration_value && (
                  <span className="text-xs text-gray-500">{task.estimated_duration_value}{task.estimated_duration_unit?.charAt(0)}</span>
                )}
                {task.due_date && (
                  <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 2: Write `packages/frontend/src/pages/Tasks.tsx`**

```tsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTasks, useCategories, Task } from '../api/queries';
import { dispatch } from '../api/commands';

const STATUS_TABS = ['ready', 'ongoing', 'pending', 'planned', 'done'] as const;

function TaskRow({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const cat = categories?.find(c => c.id === task.category_id);

  const handleComplete = async () => {
    await dispatch('CompleteTask', { id: task.id, itemDisposals: [] });
    await qc.invalidateQueries();
  };

  const handleStart = async () => {
    await dispatch('StartTask', { id: task.id });
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
      {task.due_date && (
        <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>
      )}
    </div>
  );
}

export function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'ready';
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const { data: tasks, isLoading } = useTasks({ status, ...(categoryId ? { categoryId } : {}) });
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-1 flex-wrap">
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

      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      {!isLoading && tasks?.length === 0 && <div className="text-gray-600 text-sm">No tasks with status "{status}"</div>}
      <div className="flex flex-col gap-2">
        {tasks?.map(task => <TaskRow key={task.id} task={task} />)}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Write `packages/frontend/src/pages/Items.tsx`**

```tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useItems, Item } from '../api/queries';
import { dispatch } from '../api/commands';

function ItemRow({ item }: { item: Item }) {
  const qc = useQueryClient();

  const markAvailable = async () => { await dispatch('MarkItemAvailable', { id: item.id }); await qc.invalidateQueries(); };
  const markConsumed = async () => { await dispatch('MarkItemConsumed', { id: item.id }); await qc.invalidateQueries(); };
  const markAvailableAgain = async () => { await dispatch('MarkItemAvailableAgain', { id: item.id }); await qc.invalidateQueries(); };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <div className={`w-2 h-2 rounded-full ${item.status === 'to_buy' ? 'bg-yellow-400' : item.status === 'available' ? 'bg-green-400' : 'bg-gray-600'}`} />
      <span className="flex-1 text-sm text-white">{item.name}</span>
      {item.quantity && <span className="text-xs text-gray-500">×{item.quantity}</span>}
      <div className="flex gap-2">
        {item.status === 'to_buy' && (
          <button onClick={markAvailable} className="text-xs px-2 py-1 bg-green-800 text-green-200 rounded hover:bg-green-700">Mark bought</button>
        )}
        {item.status === 'available' && (
          <button onClick={markConsumed} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">Mark used</button>
        )}
        {item.status === 'consumed' && (
          <button onClick={markAvailableAgain} className="text-xs px-2 py-1 bg-blue-800 text-blue-200 rounded hover:bg-blue-700">Still available</button>
        )}
      </div>
    </div>
  );
}

export function Items() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'to_buy';
  const { data: items, isLoading } = useItems(status !== 'all' ? { status } : {});

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-1">
        {(['to_buy', 'available', 'all'] as const).map(s => (
          <button key={s} onClick={() => setSearchParams({ status: s })}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${status === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800'}`}>
            {s === 'to_buy' ? '🛒 To Buy' : s === 'available' ? '✅ Available' : '🗄 All'}
          </button>
        ))}
      </div>
      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      {!isLoading && items?.length === 0 && <div className="text-gray-600 text-sm">No items</div>}
      <div className="flex flex-col gap-2">
        {items?.map(item => <ItemRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add packages/frontend/src/pages/Dashboard.tsx packages/frontend/src/pages/Tasks.tsx packages/frontend/src/pages/Items.tsx
git commit -m "feat: Dashboard, Tasks, Items pages"
```

---

### Task 22: Calendar, Suggest, Resources, BalanceRules pages

**Files:**
- Create: `packages/frontend/src/pages/Calendar.tsx`
- Create: `packages/frontend/src/pages/Suggest.tsx`
- Create: `packages/frontend/src/pages/Resources.tsx`
- Create: `packages/frontend/src/pages/BalanceRules.tsx`

- [x] **Step 1: Write `packages/frontend/src/pages/Calendar.tsx`**

```tsx
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { useQueryClient } from '@tanstack/react-query';
import { useTasks } from '../api/queries';
import { dispatch } from '../api/commands';

export function Calendar() {
  const qc = useQueryClient();
  const { data: tasks } = useTasks();

  const events = tasks
    ?.filter(t => t.due_date || t.scheduled_date)
    .map(t => ({
      id: t.id,
      title: t.name,
      date: t.scheduled_date ?? t.due_date?.split('T')[0],
      start: t.scheduled_date && t.scheduled_start_time ? `${t.scheduled_date}T${t.scheduled_start_time}` : t.due_date ?? undefined,
      backgroundColor: t.status === 'done' ? '#374151' : t.recurrence_rule ? '#7c3aed' : '#1d4ed8',
      borderColor: 'transparent',
    })) ?? [];

  const handleEventDrop = async (info: EventDropArg) => {
    const date = info.event.startStr.split('T')[0];
    const time = info.event.startStr.includes('T') ? info.event.startStr.split('T')[1].substring(0, 5) : '09:00';
    await dispatch('ScheduleTask', { id: info.event.id, scheduledDate: date, scheduledStartTime: time });
    await qc.invalidateQueries();
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        events={events}
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        height="auto"
        eventClassNames="cursor-pointer rounded"
      />
    </div>
  );
}
```

- [x] **Step 2: Write `packages/frontend/src/pages/Suggest.tsx`**

```tsx
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuggestions, useCategories } from '../api/queries';
import { dispatch } from '../api/commands';

const QUICK_PICKS = [0.5, 1, 2, 3];

export function Suggest() {
  const [hours, setHours] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const { data: tasks, isLoading } = useSuggestions(hours, categoryId || undefined);
  const { data: categories } = useCategories();
  const qc = useQueryClient();

  const handleStart = async (taskId: string) => {
    await dispatch('StartTask', { id: taskId });
    await qc.invalidateQueries();
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-white">What should I do?</h1>
        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-400">I have</label>
          <div className="flex gap-2 flex-wrap">
            {QUICK_PICKS.map(h => (
              <button key={h} onClick={() => setHours(h)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${hours === h ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {h < 1 ? '30 min' : `${h}h`}
              </button>
            ))}
            <input type="number" value={hours} onChange={e => setHours(parseFloat(e.target.value))} min={0.25} step={0.25}
              className="w-20 px-2 py-1.5 rounded-lg bg-gray-800 text-white text-sm border border-gray-700 outline-none" />
            <span className="text-sm text-gray-500 self-center">hours</span>
          </div>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
            className="w-full max-w-xs bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none">
            <option value="">Any category</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <div className="text-gray-500 text-sm">Finding suggestions...</div>}
      {!isLoading && tasks?.length === 0 && <div className="text-gray-600 text-sm">No ready tasks fit your available time.</div>}
      <div className="flex flex-col gap-2">
        {tasks?.map(task => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{task.name}</div>
              {task.estimated_duration_value && (
                <div className="text-xs text-gray-500 mt-0.5">{task.estimated_duration_value} {task.estimated_duration_unit}</div>
              )}
            </div>
            {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>}
            <button onClick={() => handleStart(task.id)}
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors">
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Write `packages/frontend/src/pages/Resources.tsx`**

```tsx
import React, { useState } from 'react';
import { useResources } from '../api/queries';

const TYPE_ICONS: Record<string, string> = { link: '🔗', note: '📝', video: '🎥', file: '📄', doc: '📖' };

export function Resources() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const { data: resources, isLoading } = useResources({ ...(search ? { q: search } : {}), ...(type ? { type } : {}) });

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-indigo-500" />
        <select value={type} onChange={e => setType(e.target.value)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 outline-none">
          <option value="">All types</option>
          {['link', 'note', 'video', 'file', 'doc'].map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
        </select>
      </div>
      {isLoading && <div className="text-gray-500 text-sm">Loading...</div>}
      <div className="flex flex-col gap-2">
        {resources?.map(r => (
          <div key={r.id} className="flex items-start gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
            <span className="text-lg mt-0.5">{TYPE_ICONS[r.type] ?? '📎'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{r.title}</div>
              {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline truncate block">{r.url}</a>}
              {r.notes && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{r.notes}</div>}
              {r.task_ids.length > 0 && <div className="text-xs text-gray-600 mt-1">{r.task_ids.length} task{r.task_ids.length > 1 ? 's' : ''} linked</div>}
            </div>
          </div>
        ))}
        {!isLoading && resources?.length === 0 && <div className="text-gray-600 text-sm">No resources found</div>}
      </div>
    </div>
  );
}
```

- [x] **Step 4: Write `packages/frontend/src/pages/BalanceRules.tsx`**

```tsx
import React from 'react';
import { useBalanceStatus, useBalanceRules } from '../api/queries';

export function BalanceRules() {
  const { data: status } = useBalanceStatus();
  const { data: rules } = useBalanceRules();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">Life Balance</h1>
        <p className="text-sm text-gray-500">Track whether your life stays balanced across key areas.</p>
      </div>

      <div className="flex flex-col gap-3">
        {status?.map(b => (
          <div key={b.rule_id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${b.is_met ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-900'}`}>
            <span className="text-2xl">{b.category_icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{b.category_name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {b.actual_count}/{b.target_count} {b.frequency} · {b.frequency === 'daily' ? 'today' : b.frequency === 'weekly' ? 'this week' : 'this month'}
              </div>
            </div>
            <span className={`text-sm font-medium ${b.is_met ? 'text-green-400' : 'text-red-400'}`}>
              {b.is_met ? '✅ Met' : '❌ Missing'}
            </span>
          </div>
        ))}
        {(!status || status.length === 0) && (
          <div className="text-gray-600 text-sm">No balance rules configured. Create tasks in the Study and Health categories to see your balance.</div>
        )}
      </div>

      {rules && rules.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">All Rules</h2>
          <div className="text-xs text-gray-500">
            {(rules as Array<Record<string, unknown>>).map((r, i) => (
              <div key={i} className="py-1 border-b border-gray-800 last:border-0">
                {String(r.frequency)} · min {String(r.minimum_count)} · {r.day_restriction ? String(r.day_restriction) + ' only' : 'any day'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 5: Start frontend and verify all pages load**

```bash
# Terminal 1 — backend already running on :3001
# Terminal 2:
cd packages/frontend && npm run dev
```

Open http://localhost:5173 and verify:
- Dashboard loads with status cards and balance indicators
- Tasks page shows tabs and tasks list
- Items page shows to-buy / available tabs
- Calendar renders with FullCalendar
- Suggest page shows hour selector and suggestions
- Resources page shows searchable list
- Balance page shows met/unmet status

- [x] **Step 6: Commit**

```bash
git add packages/frontend/src/pages/
git commit -m "feat: Calendar, Suggest, Resources, BalanceRules pages"
```

---

### Task 23: MCP Server

**Files:**
- Create: `packages/mcp/src/db.ts`
- Create: `packages/mcp/src/index.ts`

- [x] **Step 1: Write `packages/mcp/src/db.ts`**

```typescript
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  }
  return pool;
}
```

- [x] **Step 2: Write `packages/mcp/src/index.ts`**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getPool } from './db';

const server = new Server(
  { name: 'personal-care-gtd', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'get_ready_tasks', description: 'Get all tasks with status = ready', inputSchema: { type: 'object', properties: {} } },
    { name: 'suggest_for_duration', description: 'Get ready tasks fitting within available hours, balance-aware', inputSchema: { type: 'object', properties: { hours: { type: 'number', description: 'Available hours' } }, required: ['hours'] } },
    { name: 'get_items_to_buy', description: 'Get all items with status = to_buy', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_upcoming_due', description: 'Get tasks due within N days', inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'Number of days ahead' } }, required: ['days'] } },
    { name: 'get_category_summary', description: 'Get per-category task and item counts', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_todays_schedule', description: 'Get tasks scheduled for today with start times', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_free_slots', description: 'Get unscheduled hour gaps in a day', inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'Date in YYYY-MM-DD format' } }, required: ['date'] } },
    { name: 'get_balance_status', description: 'Get all balance rules with current period met/unmet status', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_unmet_balance_rules', description: 'Get only the balance rules not yet met for the current period', inputSchema: { type: 'object', properties: {} } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const pool = getPool();
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_ready_tasks': {
        const rows = await pool.query(
          `SELECT t.id, t.name, t.estimated_duration_value, t.estimated_duration_unit, t.due_date, c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.status = 'ready' ORDER BY t.due_date ASC NULLS LAST`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'suggest_for_duration': {
        const { hours } = z.object({ hours: z.number() }).parse(args);
        const unmet = await pool.query('SELECT category_id FROM balance_status_view WHERE is_met = false');
        const priorityIds = new Set(unmet.rows.map((r: { category_id: string }) => r.category_id));
        const rows = await pool.query(
          `SELECT t.id, t.name, t.estimated_duration_value, t.estimated_duration_unit, t.due_date,
                  t.category_id, c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.status = 'ready'
             AND (t.estimated_duration_value IS NULL
               OR (t.estimated_duration_unit = 'hour' AND t.estimated_duration_value <= $1)
               OR (t.estimated_duration_unit = 'day' AND t.estimated_duration_value * 8 <= $1))
           ORDER BY t.due_date ASC NULLS LAST`,
          [hours]
        );
        const sorted = rows.rows.sort((a: { category_id: string }, b: { category_id: string }) => {
          return (priorityIds.has(a.category_id) ? 0 : 1) - (priorityIds.has(b.category_id) ? 0 : 1);
        });
        return { content: [{ type: 'text', text: JSON.stringify(sorted, null, 2) }] };
      }

      case 'get_items_to_buy': {
        const rows = await pool.query(
          `SELECT i.id, i.name, i.quantity, i.price, c.name as category_name, c.icon as category_icon
           FROM items_view i LEFT JOIN categories_view c ON c.id = i.category_id
           WHERE i.status = 'to_buy' ORDER BY c.name, i.name`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_upcoming_due': {
        const { days } = z.object({ days: z.number() }).parse(args);
        const rows = await pool.query(
          `SELECT t.id, t.name, t.due_date, t.status, c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '${Math.floor(days)} days'
             AND t.status != 'done'
           ORDER BY t.due_date ASC`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_category_summary': {
        const rows = await pool.query(
          'SELECT id, name, icon, color, task_count, item_count FROM categories_view WHERE deleted = false ORDER BY name'
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_todays_schedule': {
        const rows = await pool.query(
          `SELECT t.id, t.name, t.scheduled_date, t.scheduled_start_time,
                  t.estimated_duration_value, t.estimated_duration_unit,
                  c.name as category_name, c.icon as category_icon
           FROM tasks_view t LEFT JOIN categories_view c ON c.id = t.category_id
           WHERE t.scheduled_date = CURRENT_DATE
           ORDER BY t.scheduled_start_time ASC NULLS LAST`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_free_slots': {
        const { date } = z.object({ date: z.string() }).parse(args);
        const scheduled = await pool.query(
          `SELECT scheduled_start_time, estimated_duration_value, estimated_duration_unit
           FROM tasks_view WHERE scheduled_date = $1 AND scheduled_start_time IS NOT NULL
           ORDER BY scheduled_start_time`,
          [date]
        );
        const busySlots = scheduled.rows.map((r: { scheduled_start_time: string; estimated_duration_value: number; estimated_duration_unit: string }) => {
          const [h, m] = r.scheduled_start_time.split(':').map(Number);
          const startHour = h + m / 60;
          const durationHours = r.estimated_duration_unit === 'hour' ? (r.estimated_duration_value ?? 1) : 8;
          return { start: startHour, end: startHour + durationHours };
        });

        const freeSlots: Array<{ from: string; to: string; hours: number }> = [];
        const workStart = 8; const workEnd = 22;
        let cursor = workStart;
        for (const slot of busySlots) {
          if (cursor < slot.start) {
            const hours = slot.start - cursor;
            freeSlots.push({ from: `${Math.floor(cursor)}:${String((cursor % 1) * 60).padStart(2, '0')}`, to: `${Math.floor(slot.start)}:${String((slot.start % 1) * 60).padStart(2, '0')}`, hours });
          }
          cursor = Math.max(cursor, slot.end);
        }
        if (cursor < workEnd) freeSlots.push({ from: `${Math.floor(cursor)}:00`, to: `${workEnd}:00`, hours: workEnd - cursor });

        return { content: [{ type: 'text', text: JSON.stringify({ date, freeSlots }, null, 2) }] };
      }

      case 'get_balance_status': {
        const rows = await pool.query(
          `SELECT bs.*, c.name as category_name, c.icon as category_icon
           FROM balance_status_view bs LEFT JOIN categories_view c ON c.id = bs.category_id
           ORDER BY bs.frequency`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      case 'get_unmet_balance_rules': {
        const rows = await pool.query(
          `SELECT bs.*, c.name as category_name, c.icon as category_icon
           FROM balance_status_view bs LEFT JOIN categories_view c ON c.id = bs.category_id
           WHERE bs.is_met = false ORDER BY bs.frequency`
        );
        return { content: [{ type: 'text', text: JSON.stringify(rows.rows, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GTD MCP server running');
}

main().catch(console.error);
```

- [x] **Step 3: Install MCP dependencies**

```bash
cd packages/mcp && npm install
```

- [x] **Step 4: Add MCP server to Claude Desktop config**

Open Claude Desktop config at `%APPDATA%\Claude\claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "personal-care-gtd": {
      "command": "node",
      "args": ["E:/Projects/personal-care/packages/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/personal_care"
      }
    }
  }
}
```

Build the MCP server first:

```bash
cd packages/mcp && npx tsc
```

Expected: `packages/mcp/dist/index.js` created.

- [x] **Step 5: Restart Claude Desktop and verify MCP tools are available**

Restart Claude Desktop. In a new Claude conversation, ask:
```
What tasks do I have ready to start?
```

Claude should call `get_ready_tasks` and return your tasks.

- [x] **Step 6: Set up morning briefing via Claude Code /schedule**

In Claude Code, run:
```
/schedule
```

Create a daily schedule at 8:00 AM with this prompt:
```
Call these MCP tools: get_todays_schedule, get_free_slots for today, get_ready_tasks, get_unmet_balance_rules. Then give me a morning briefing: what's on my schedule today, what are my free time slots, what tasks are ready to start (prioritizing unmet balance rules), and what do I need to buy.
```

- [x] **Step 7: Commit**

```bash
git add packages/mcp/
git commit -m "feat: MCP server with 9 tools for Claude Desktop integration"
```

---

**Phase 4 complete. GTD Core is fully implemented:**
- React frontend with 7 screens (Dashboard, Tasks, Items, Calendar, Suggest, Resources, BalanceRules)
- Sidebar + CommandBar (⌘K) layout
- MCP server with 9 tools connected to Claude Desktop
- Morning briefing via Claude Code /schedule

**Run everything:**
```bash
# Terminal 1 — PostgreSQL
docker-compose up -d

# Terminal 2 — Backend
cd packages/backend && npx ts-node --esm src/index.ts

# Terminal 3 — Frontend
cd packages/frontend && npm run dev

# MCP server runs via Claude Desktop (stdio transport)
```

Open http://localhost:5173 to use the app.

---

## Completion Summary

**Date completed:** 2026-06-17

**Total tasks:** 6 (Tasks 18–23)

**Commits:**
- `bf6cd5b` feat: frontend scaffold with Vite, React, Tailwind
- `a54ff2c` feat: frontend API client, command dispatcher, and query hooks
- `310cf9c` feat: App shell, Sidebar navigation, CommandBar (⌘K)
- `f74d205` Dashboard/Tasks/Items pages (mixed with concurrent backend test commit)
- `21acb53` feat: Calendar, Suggest, Resources, BalanceRules pages
- `232c93d` feat: MCP server with 9 tools for Claude Desktop integration

**Deviations from plan:**
1. Lint fixes applied to Calendar/Tasks/Items pages (unused imports, `import type`, unescaped JSX quotes) — behavior unchanged.
2. `tsconfig.eslint.json` added for frontend and mcp packages (mirrors backend pattern) — required for pre-commit hook.
3. MCP `tsconfig.json`: changed `module` from `"CommonJS"` to `"Node16"` to match `moduleResolution: "node16"`.
4. Dashboard/Tasks/Items accidentally bundled into a concurrent session's backend test commit — content correct.

**Pending manual steps (Task 23 steps 4–6):**
- Build MCP: `npx tsc -p packages/mcp/tsconfig.json`
- Add server to `%APPDATA%\Claude\claude_desktop_config.json` (see plan Task 23 Step 4)
- Restart Claude Desktop and verify `get_ready_tasks` works
- Set up morning briefing via `/schedule` in Claude Code
