# Categories Management Page — Design Spec

**Date:** 2026-06-17

## Problem

There is no UI to create, edit, or delete categories. The CommandBar task-creation form shows an empty "Select category…" dropdown because the database starts with no categories. Users must either run the seed script or POST raw commands to the API — neither is acceptable for normal use.

## Goal

Add a Categories management page where users can create, edit, and delete categories from within the app.

## Scope

Frontend only. All three backend commands (`CreateCategoryCommand`, `UpdateCategoryCommand`, `DeleteCategoryCommand`) and the `/categories` query endpoint already exist and are tested.

---

## Architecture

Single new file: `packages/frontend/src/pages/Categories.tsx`. Self-contained, no extracted sub-components — consistent with `Items.tsx` and `BalanceRules.tsx`.

Wired into the router at `/categories` in `App.tsx`. A sidebar link added to the bottom utility section alongside Calendar, Suggest, Resources, and Balance.

---

## Components

### `Categories` (page root)

- Fetches categories via existing `useCategories()` hook.
- Tracks `addingNew: boolean` state — when true, renders a `NewCategoryRow` at the bottom of the list.
- Renders a heading, description, the list of `CategoryRow` items, and an "Add Category" button.

### `CategoryRow`

Two modes, toggled by local `editing: boolean` state.

**View mode:**
- Icon · Name · Color swatch · task count chip · item count chip
- "Edit" button → switches to edit mode
- "Delete" button — disabled (with `title` tooltip) when `task_count > 0 || item_count > 0`; otherwise dispatches `DeleteCategoryCommand` and invalidates queries

**Edit mode (inline expansion):** Pre-populated with the category's current `icon`, `name`, and `color` values.
- Emoji grid (see below) bound to `icon` field
- Name text input
- Color swatch picker (see below) bound to `color` field
- "Save" button → dispatches `UpdateCategoryCommand`, exits edit mode, invalidates queries
- "Cancel" button → reverts to view mode with no changes

### `NewCategoryRow`

Always in edit mode. Same emoji grid + name input + color picker as `CategoryRow` edit mode. Initial state: first emoji (`💪`) pre-selected, first color (`#ef4444`) pre-selected, name field empty.

- "Save" → dispatches `CreateCategoryCommand` with `isDefault: false` and a new `uuidv4()` id, invalidates queries, hides the row
- "Cancel" → hides the row (sets `addingNew` to false)

---

## Emoji Grid

Fixed set of 24 emojis rendered as a 6-column clickable grid. Selected emoji has an indigo ring (`ring-2 ring-indigo-500`).

```
💪 🏃 🧘 🛁 💊 🥗
📚 🎯 🏠 🌿 💤 🧹
🛒 🔧 🎨 🎵 💻 📝
🧠 💡 🌟 ⚡ 🔑 📅
```

---

## Color Swatches

8 preset hex colors rendered as small circles. Selected color has an indigo ring.

| Label | Hex |
|-------|-----|
| Red | `#ef4444` |
| Orange | `#f97316` |
| Yellow | `#eab308` |
| Green | `#22c55e` |
| Blue | `#3b82f6` |
| Purple | `#8b5cf6` |
| Pink | `#ec4899` |
| Gray | `#6b7280` |

---

## Data Flow

| Action | Command | Payload |
|--------|---------|---------|
| Create | `CreateCategoryCommand` | `{ id: uuidv4(), name, icon, color, isDefault: false }` |
| Edit | `UpdateCategoryCommand` | `{ id, name, icon, color }` |
| Delete | `DeleteCategoryCommand` | `{ id }` |

After every dispatch: `qc.invalidateQueries()` — refreshes the categories list and the sidebar "By Category" section simultaneously.

`isDefault` is never set to `true` from the UI. The seed script manages default categories; `UpdateCategoryCommand` does not accept `isDefault`, so this is also enforced by the backend.

---

## Delete Guard

Deletion is blocked in the UI when `category.task_count > 0 || category.item_count > 0`. The Delete button is `disabled` and shows a `title` tooltip: `"Reassign or remove all tasks and items first"`. No network call is made. The guard relies on `task_count`/`item_count` returned by the existing `/categories` query.

---

## Navigation

- Route: `/categories` added to `App.tsx`
- Sidebar: `🏷 Categories` link added to the bottom utility section (same `NavLink` pattern as existing bottom links)

---

## Testing

No new spec files. The backend commands and query are fully covered by existing specs. Manual verification:

1. Open Categories page — list is empty initially
2. Create a category — appears in sidebar and CommandBar dropdown immediately
3. Edit the category — name/icon/color update reflects everywhere
4. Attempt to delete a category with tasks assigned — Delete button is disabled
5. Delete a category with no tasks/items — removed from list and sidebar
