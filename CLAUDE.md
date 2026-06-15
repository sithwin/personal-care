# personal-care

GTD-style personal care management app — event-sourced monorepo.

## Stack

- **Monorepo:** npm workspaces (`packages/backend`, `packages/frontend`, `packages/mcp`)
- **Backend:** Node.js 20 · TypeScript 5 · PostgreSQL 16 (event store) · Express · pg · vitest
- **Frontend:** React 18 · Vite · Tailwind · TanStack Query · FullCalendar
- **MCP:** `@modelcontextprotocol/sdk` · zod

## Dev

```bash
docker-compose up -d          # start PostgreSQL
npm run dev:backend            # backend on :3001
npm run dev:frontend           # frontend on :5173
npm test                       # all workspaces
```

## Architecture

Domain aggregates are **pure functions** — they receive a command + event history, return new events. The `EventStore` persists events to PostgreSQL with optimistic concurrency. The `CommandBus` routes commands to aggregates and persists their events.

## Plans

Implementation plans live in `docs/superpowers/plans/`. After completing every task in a plan file, **update the plan file** to mark all steps as done and append a completion summary at the bottom with: date completed, total tasks, total tests, and any deviations from the plan.
