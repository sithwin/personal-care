# Header App Bar Redesign

**Date:** 2026-06-20
**Status:** Approved

## Goal

Move the "Personal GTD" app title from the Sidebar into the header, restructure the header into a proper 3-zone app bar, and remove the title from the Sidebar so navigation starts cleanly with the status links.

## Current State

- `App.tsx` header contains only `<TopBar />` (the search box), left-aligned with `max-w-xl`
- `Sidebar.tsx` starts with a "Personal GTD" `<NavLink to="/">` as the first item
- The header has no title; the sidebar doubles as the home link

## Target Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Personal GTD  │   Search tasks, projects, items…   │  [·····]  │
│  (w-56, left)  │      (flex-1, max-w-xl, center)    │  (w-56)   │
└─────────────────────────────────────────────────────────────────┘
│  Sidebar (w-56)  │  Main content                               │
│  By Status       │  (dashboard, tasks, etc.)                   │
│  …               │                                             │
```

### Left zone
- "Personal GTD" rendered as `<Link to="/">` — bold white text
- Fixed width `w-56` to align with the sidebar column below

### Center zone
- `<TopBar />` component unchanged internally
- Wrapped in a `flex-1` container with `flex justify-center`
- `TopBar` retains its own `max-w-xl` constraint so the input doesn't stretch unbounded on wide screens

### Right zone
- Empty `div` with `w-56` to balance the left zone and keep the search optically centered
- Structurally ready for future additions (profile icon, settings gear, notifications)

## Files Changed

| File | Change |
|------|--------|
| `packages/frontend/src/App.tsx` | Restructure `<header>` to 3-zone flex layout; add "Personal GTD" Link on the left |
| `packages/frontend/src/components/layout/Sidebar.tsx` | Remove the "Personal GTD" NavLink from the top |

`TopBar.tsx` is not modified.

## Non-Goals

- No changes to search behaviour or dropdown results
- No actual right-zone content (placeholder only)
- No changes to sidebar width or main layout below the header
