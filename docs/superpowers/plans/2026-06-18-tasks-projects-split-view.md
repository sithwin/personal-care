# Tasks Page Split-View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `packages/frontend/src/pages/Tasks.tsx` into a responsive two-column split view — tasks on the left, sticky projects panel on the right — stacking vertically on screens narrower than 1024px.

**Architecture:** All changes are Tailwind class edits inside a single file. The outer `Tasks` container switches from `flex-col` to `flex-col lg:flex-row`. The tasks `<section>` gets `flex-1 min-w-0`; the projects `<section>` gets a fixed `lg:w-80` width plus `lg:sticky` positioning. `ProjectCard` and `NewProjectRow` lose their `w-56 flex-shrink-0` constraints so they fill the panel width.

**Tech Stack:** React 18 · Tailwind CSS · Vite (dev server on `:5173`)

## Global Constraints

- Only `packages/frontend/src/pages/Tasks.tsx` is modified — no backend, no new files, no new routes.
- Responsive breakpoint is `lg` (1024px) — use `lg:` prefix, not `md:` or `xl:`.
- No changes to `TaskRow`, `ProjectCard` internal content/actions, or `NewProjectRow` form logic.
- No `any` types — this task touches no TypeScript logic, only JSX class strings.

---

### Task 1: Restructure Tasks.tsx to split-view layout

**Files:**
- Modify: `packages/frontend/src/pages/Tasks.tsx`

**Interfaces:**
- Consumes: nothing from other tasks (self-contained layout change)
- Produces: nothing consumed by other tasks

---

- [ ] **Step 1: Change the outer container from vertical stack to responsive row**

In `packages/frontend/src/pages/Tasks.tsx`, find line 371 (the `Tasks` function's return):

```tsx
// Before
<div className="flex flex-col gap-8">
```

Change it to:

```tsx
// After
<div className="flex flex-col lg:flex-row lg:items-start gap-8">
```

`lg:items-start` is required so the two columns align to their top edges rather than stretching to equal height — equal height would break the sticky positioning of the right panel.

---

- [ ] **Step 2: Add sizing class to the tasks `<section>`**

Find the tasks `<section>` opening tag (currently a bare `<section>`):

```tsx
// Before — line ~374
<section>
  <h2 className="text-lg font-semibold text-white mb-3">Tasks</h2>
```

Change it to:

```tsx
// After
<section className="flex-1 min-w-0">
  <h2 className="text-lg font-semibold text-white mb-3">Tasks</h2>
```

`flex-1` lets the tasks column take all remaining horizontal space. `min-w-0` prevents flex children from overflowing their container when task names are long (flex items default to `min-width: auto`).

---

- [ ] **Step 3: Add sizing and sticky classes to the projects `<section>`**

Find the projects `<section>` opening tag (currently a bare `<section>`):

```tsx
// Before — line ~401
<section>
  <h2 className="text-lg font-semibold text-white mb-3">Projects</h2>
```

Change it to:

```tsx
// After
<section className="w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
  <h2 className="text-lg font-semibold text-white mb-3">Projects</h2>
```

- `w-full` makes the section full-width on narrow screens.
- `lg:w-80` fixes the panel to 320px on wide screens.
- `lg:flex-shrink-0` prevents it from shrinking if the tasks column needs more space.
- `lg:sticky lg:top-6` pins the panel 24px from the top of the `<main>` scroll container (which has `overflow-y-auto` in `App.tsx`).
- `lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto` gives the panel its own scrollbar when there are more projects than fit in the viewport.

---

- [ ] **Step 4: Change the project card container from wrapping row to vertical stack**

Find the container `<div>` that wraps the `ProjectCard` components and `NewProjectRow` (inside the projects `<section>`):

```tsx
// Before — line ~404
<div className="flex flex-wrap gap-3">
  {projects?.map(p => <ProjectCard key={p.id} project={p} />)}
  {addingProject && <NewProjectRow onDone={() => setAddingProject(false)} />}
</div>
```

Change it to:

```tsx
// After
<div className="flex flex-col gap-3">
  {projects?.map(p => <ProjectCard key={p.id} project={p} />)}
  {addingProject && <NewProjectRow onDone={() => setAddingProject(false)} />}
</div>
```

---

- [ ] **Step 5: Remove the fixed-width constraint from `ProjectCard`**

Find the `ProjectCard` function's root `<div>` (line ~252):

```tsx
// Before
<div className="flex flex-col gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl w-56 flex-shrink-0 hover:border-gray-700 transition-colors">
```

Change it to:

```tsx
// After
<div className="flex flex-col gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
```

Remove `w-56` and `flex-shrink-0`. The card's internal layout (`flex flex-col`) already fills its container at any width.

---

- [ ] **Step 6: Remove the fixed-width constraint from `NewProjectRow`**

Find the `NewProjectRow` function's root `<div>` (line ~335):

```tsx
// Before
<div className="flex flex-col gap-2 p-4 bg-gray-900 border border-indigo-700 border-dashed rounded-xl w-56 flex-shrink-0">
```

Change it to:

```tsx
// After
<div className="flex flex-col gap-2 p-4 bg-gray-900 border border-indigo-700 border-dashed rounded-xl">
```

Remove `w-56` and `flex-shrink-0`. All form inputs inside are already `w-full`.

---

- [ ] **Step 7: Start the dev server and verify the layout**

Ensure the backend and database are running, then start the frontend:

```bash
docker-compose up -d
npm run dev:frontend
```

Open `http://localhost:5173/tasks` in a browser.

**Wide screen (≥ 1024px) — expected:**
- Tasks list occupies the left portion, taking available width.
- Projects panel is fixed at ~320px on the right.
- Scroll the page down past a long task list — the projects panel should remain visible (sticky).
- If there are more projects than fit, the panel itself should scroll independently.

**Narrow screen (< 1024px) — expected:**
- Resize the browser window below 1024px.
- Tasks list and projects panel stack vertically; projects appear below tasks.
- No content is hidden or clipped.

**Edge cases to check:**
- A task with a very long name should not overflow the left column.
- The `+ New Project` button should appear inside the right panel on wide screens.
- Clicking `+ New Project` should expand the `NewProjectRow` form inside the right panel, full-width.

---

- [ ] **Step 8: Commit**

```bash
git add packages/frontend/src/pages/Tasks.tsx
git commit -m "feat(frontend): split Tasks page into responsive two-column layout with sticky projects panel"
```
