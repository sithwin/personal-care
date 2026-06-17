# Tasks Page Split-View with Sticky Projects Panel

**Date:** 2026-06-18  
**Status:** Approved

## Overview

Restructure the Tasks page (`/tasks`) from a single-column vertical layout into a responsive two-column split view: the task list occupies the left column, and the project cards occupy a sticky right panel. On screens narrower than 1024px the two sections stack vertically.

## Layout

### Wide screens (≥ 1024px / `lg` breakpoint)

```
┌─ Sidebar (w-56) ─┬─ main (flex-1, overflow-y-auto, p-6) ──────────────────┐
│                  │  ┌─ Tasks (flex-1, min-w-0) ────┐ ┌─ Projects (w-80) ─┐│
│                  │  │  [status tabs]                │ │  sticky top-6     ││
│                  │  │  [task rows…]                 │ │  [project cards…] ││
│                  │  │  ↕ scrolls with page          │ │  [+ New Project]  ││
│                  │  └──────────────────────────────┘ │  ↕ own scrollbar  ││
│                  │                                    └───────────────────┘│
└──────────────────┴────────────────────────────────────────────────────────┘
```

The outer container of `Tasks` changes from `flex flex-col gap-8` to `flex flex-col lg:flex-row lg:items-start gap-8`.

**Left column — tasks section**  
`flex-1 min-w-0` — takes all remaining horizontal space. `min-w-0` prevents flex overflow when task names are long.

**Right column — projects section**  
`w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto`  
Pinned to the top of the viewport while the task list scrolls. Gains its own scrollbar when the project list overflows the panel height.

### Narrow screens (< 1024px)

The `lg:` prefixes mean none of the sticky/fixed-width classes activate. Both sections render at full width, stacked vertically — projects appear below the task list. No content is hidden.

## Component Changes

### `Tasks` (outer layout)

| Before | After |
|--------|-------|
| `<div className="flex flex-col gap-8">` | `<div className="flex flex-col lg:flex-row lg:items-start gap-8">` |

Both `<section>` elements gain a wrapper class:

- Tasks `<section>`: add `flex-1 min-w-0`
- Projects `<section>`: add `w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto`

### `ProjectCard`

Remove `w-56 flex-shrink-0` from the root `<div>`. The card already uses `flex flex-col gap-3 p-4`; at full width it renders cleanly without any other internal changes.

### `NewProjectRow`

Remove `w-56 flex-shrink-0` from the root `<div>`. Same reasoning — the form fields are already `w-full` internally.

### Project card container (inside `Tasks`)

| Before | After |
|--------|-------|
| `<div className="flex flex-wrap gap-3">` | `<div className="flex flex-col gap-3">` |

Cards switch from a horizontal wrapping row to a vertical stack, one card per row at the full panel width.

## Responsive Behaviour Summary

| Viewport | Tasks column | Projects column |
|----------|-------------|-----------------|
| ≥ 1024px | `flex-1`, scrolls with page | `w-80`, sticky, independent scroll |
| < 1024px | full width | full width, stacked below tasks |

## Out of Scope

- No changes to the Dashboard page (`/`)
- No changes to `ProjectCard` internal content or actions
- No changes to `TaskRow` or task-related logic
- No new routes, API calls, or backend changes

## Files Changed

- `packages/frontend/src/pages/Tasks.tsx` — layout and card container only
