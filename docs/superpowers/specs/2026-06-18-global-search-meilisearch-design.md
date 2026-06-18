# Global Search with Meilisearch

**Date:** 2026-06-18
**Status:** Approved

## Problem

The app has no working cross-entity search. The existing `CommandBar` on the Dashboard opens a modal that navigates to `/tasks?search=`, but `Tasks.tsx` ignores that parameter — search is broken and limited to tasks only. The modal interaction is being removed; the replacement must be accessible from every page and cover tasks, projects, and items.

## Goals

- Inline search input in a persistent top bar, accessible from every page
- Live dropdown results below the input, grouped by type (Tasks / Projects / Items)
- Click a result to navigate directly to that entity
- Search backed by Meilisearch for full-text, typo-tolerant matching across all three types
- Event-driven index kept in sync via the existing projector pattern — no polling, no dual-write hacks

## Non-Goals

- Dedicated search results page (`/search` route)
- Faceted filtering, sorting by relevance score, or advanced query syntax
- Individual detail pages for items or projects (navigation goes to the list page for those types)
- Elasticsearch or OpenSearch (Meilisearch chosen for low operational overhead)

---

## Section 1 — Infrastructure

### Docker
Add a `meilisearch` service to `docker-compose.yml`:
- Image: `getmeili/meilisearch:latest`
- Port: `7700:7700`
- Named volume for persistence: `meilisearch_data`
- Env: `MEILI_MASTER_KEY` set to a local dev key

### Environment Variables
Add to `packages/backend/src/config/env.ts` (Zod-validated at startup):
- `MEILISEARCH_URL` — default `http://localhost:7700`
- `MEILISEARCH_API_KEY` — matches `MEILI_MASTER_KEY`

### Package
Add `meilisearch` (official JS SDK) to `packages/backend/package.json`.

---

## Section 2 — Index Design

**One index:** `personal_care`

**Document shape:**
```ts
interface SearchDocument {
  id: string;           // "task-<uuid>" | "project-<uuid>" | "item-<uuid>"
  entityId: string;     // raw UUID — used for navigation
  type: 'task' | 'project' | 'item';
  name: string;
  description: string | null;
  status: string | null;
  categoryId: string | null;
}
```

ID prefixing (`task-`, `project-`, `item-`) prevents UUID collisions across types in a single index.

**Meilisearch index settings (applied once at startup):**
- `searchableAttributes`: `['name', 'description']`
- `filterableAttributes`: `['type', 'status', 'categoryId']`
- `sortableAttributes`: `['name']`

Typo-tolerance and relevance ranking are handled by Meilisearch automatically.

---

## Section 3 — Event-Driven Indexer

### Port
New file: `packages/backend/src/application/ports/ISearchIndexer.ts`

```ts
export interface ISearchIndexer {
  upsert(doc: SearchDocument): Promise<void>;
  delete(id: string): Promise<void>;
  bootstrap(docs: SearchDocument[]): Promise<void>;
}
```

`bootstrap` is used for the cold-start backfill (see Section 4).

### Adapter
New file: `packages/backend/src/infrastructure/search/MeilisearchSearchIndexer.ts`

- Constructor takes `url` and `apiKey`
- On first call (or at startup), creates the `personal_care` index if absent and applies settings
- `upsert` calls `index.addDocuments([doc])`
- `delete` calls `index.deleteDocument(id)`
- `bootstrap` calls `index.addDocuments(docs)` in batches

### Projectors
Three new projectors added alongside the existing ones:

**`tasks-search.projector.ts`** — handles:
- `TaskCreated` → upsert `{ id: "task-<id>", type: "task", name, description, status: "ready", categoryId }`
- `TaskUpdated` → upsert with updated `name`, `description`, `categoryId`
- `TaskStarted`, `TaskCompleted` → upsert with updated `status`

**`items-search.projector.ts`** — handles:
- `ItemCreated` → upsert `{ id: "item-<id>", type: "item", name, description, status: "to_buy", categoryId }`
- `ItemMarkedAvailable`, `ItemMarkedConsumed`, `ItemMarkedAvailableAgain` → upsert with updated `status`

**`projects-search.projector.ts`** — handles:
- `ProjectCreated` → upsert `{ id: "project-<id>", type: "project", name, description, status: "draft", categoryId }`
- `ProjectUpdated` → upsert with updated `name`, `description`
- `ProjectStarted`, `ProjectCompleted`, `ProjectPaused`, `ProjectResumed` → upsert with updated `status`

### Wiring
In `composition-root.ts`, instantiate `MeilisearchSearchIndexer` and pass it to the three new projectors. Add them to `createProjectorRunner([...])`.

---

## Section 4 — Cold-Start Backfill

Called from `main()` in `index.ts` as an async step after `buildDependencies`, alongside `runMigrations` and `seed`:

```ts
await bootstrapSearchIndex(deps.searchIndexer, pool);
```

`bootstrapSearchIndex` is a standalone async function in `infrastructure/search/`:

1. Check if the `personal_care` index has zero documents
2. If empty, read all records from PG view tables (`task_view`, `item_view`, `project_view`)
3. Map to `SearchDocument[]` and call `searchIndexer.bootstrap(docs)`

This ensures a fresh Meilisearch container (e.g. after `docker-compose down -v`) is repopulated automatically without any manual step. `buildDependencies` stays synchronous.

The backfill reads from PG views (not from event replay) since the views are already up to date.

---

## Section 5 — Search Query API

### Port
New file: `packages/backend/src/application/ports/ISearchQueryService.ts`

```ts
export interface SearchHit {
  entityId: string;
  type: 'task' | 'project' | 'item';
  name: string;
  status: string | null;
  categoryId: string | null;
}

export interface SearchResults {
  tasks: SearchHit[];
  projects: SearchHit[];
  items: SearchHit[];
}

export interface ISearchQueryService {
  search(q: string): Promise<SearchResults>;
}
```

### Adapter
New file: `packages/backend/src/infrastructure/queries/MeilisearchSearchQueryService.ts`

- Calls `index.search(q, { limit: 15 })` — returns up to 15 hits total
- Partitions results by `type` into `{ tasks, projects, items }`
- Each partition capped at 5 results

### Route
New file: `packages/backend/src/api/routes/search.router.ts`

- `GET /api/v1/search?q=<term>`
- Returns 400 if `q` is absent or fewer than 2 characters
- Returns `SearchResults` JSON

Registered in `index.ts`: `app.use('/api/v1/search', makeSearchRouter(deps.searchQueryService))`

`searchQueryService` added to `AppDependencies` interface and instantiated in `buildDependencies`.

---

## Section 6 — Frontend

### App Layout
`App.tsx` updated from two-column (`Sidebar + main`) to three-zone (`TopBar` full-width, then `Sidebar + main` below):

```
┌─────────────────────────────────┐
│           TopBar                │  ← search input lives here
├──────────┬──────────────────────┤
│ Sidebar  │       main           │
│          │                      │
└──────────┴──────────────────────┘
```

### TopBar Component
New file: `packages/frontend/src/components/layout/TopBar.tsx`

- Contains the search `<input>` spanning most of the bar width
- Placeholder: `⌘ Search tasks, projects, items...`
- Cmd+K / Ctrl+K focuses the input from anywhere on the page (`useEffect` on `window`)
- Escape dismisses the dropdown and blurs the input

### Search Dropdown
Rendered as a `position: absolute` element below the input, `z-50`, with a max-height and scroll.

Results grouped into three labelled sections:
```
TASKS
  □ Set up solar light          ready
  □ Buy new filter              pending
PROJECTS
  🏠 Home Renovation            active
ITEMS
  🔦 Solar lamp                 to_buy
```

Each row: icon placeholder + name + status badge. Click → navigate + clear input + close dropdown.

### State & Data Flow
- `useState` for `query` (controlled input value)
- `useState` for `open` (dropdown visible)
- `useSearch(q)` hook: calls `GET /api/v1/search?q=` via TanStack Query, `enabled: q.length >= 2`, `staleTime: 10_000`
- Debounce: 300ms via `useEffect` + `setTimeout` on `query` → sets a `debouncedQuery` that drives the hook
- Click-outside: `useRef` on the container + `mousedown` listener

### Navigation Targets
| Type | Destination |
|---|---|
| Task | `/tasks/:entityId` |
| Project | `/tasks` |
| Item | `/items` |

### Dashboard Cleanup
`Dashboard.tsx` removes the `<CommandBar />` import and usage. The `CommandBar` component file is deleted.

---

## Testing

**Backend:**
- `MeilisearchSearchIndexer` unit tests: upsert, delete, bootstrap (mock the Meilisearch client)
- `search.router.ts` integration test: valid query returns 200 with `{ tasks, projects, items }` shape; missing `q` returns 400
- Projector unit tests for each of the three search projectors: correct `upsert` called for each relevant event type

**Frontend:**
- `TopBar` unit test: typing triggers `useSearch`, results render grouped, click navigates
- `useSearch` hook test: `enabled` is false under 2 chars, fetches on 2+ chars

---

## Open Questions

None — all decisions made during design session.
