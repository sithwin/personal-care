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

Domain aggregates are **classes** — a private constructor, a static `reconstruct(history)` factory that replays event history into state, and one method per command that returns new domain event(s). The `EventStore` persists events to PostgreSQL with optimistic concurrency. The `CommandBus` is a pure registry in infrastructure: one `ICommandHandler` per command, dispatched by command type, with side effects (projections) triggered after persistence.

## Plans

Implementation plans live in `docs/superpowers/plans/`. After completing every task in a plan file, **update the plan file** to mark all steps as done and append a completion summary at the bottom with: date completed, total tasks, total tests, and any deviations from the plan.

## Clean Architecture

Layers are concentric — **dependencies only point inward**. Outer layers know about inner layers; inner layers know nothing about outer layers.

```
┌─────────────────────────────────────┐
│  Infrastructure / Frameworks        │  ← pg, Express, email SDKs
│  ┌───────────────────────────────┐  │
│  │  Interface Adapters           │  │  ← repositories, route handlers, DTOs
│  │  ┌─────────────────────────┐  │  │
│  │  │  Application (Use Cases)│  │  │  ← command handlers, queries
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │  Domain (Entities)│  │  │  │  ← aggregates, value objects, events
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**The Dependency Rule:** nothing in `domain/` or `application/` may import from `infrastructure/`, `pg`, `express`, or any framework. Interfaces (ports) defined in the inner layers; implementations (adapters) live in the outer layers.

**Layer mapping for this repo:**
- `domain/` → Entities: aggregates, value objects, domain events, repository interfaces
- `application/` → Use Cases: command handlers, query handlers, ICommandBus, IEventStore
- `infrastructure/` → Adapters + Frameworks: PgEventStore, Express routers, email services

## Coding Standards

### Domain-Driven Design (enforced on every aggregate)

> Full rules: [`docs/coding-standards/ddd-standard.md`](docs/coding-standards/ddd-standard.md)

- Domain aggregates are classes — zero infrastructure dependencies
- Private constructor; `static reconstruct(history)` replays events into state, returns `null` if never created
- One method per command; `create` is `static`, all others are instance methods enforcing invariants against `this.state`
- Domain Events are classes extending the abstract `DomainEvent` base — name in past tense (`CareEventScheduled`)
- Never expose internal domain state directly — only via the methods above
- Repository interfaces live in domain layer; implementations in infrastructure

### SOLID
- Single Responsibility: one reason to change per class/module
- Open/Closed: extend via new event types / handlers, not by modifying aggregates
- Dependency Inversion: depend on interfaces (`IEventStore`, `ICommandBus`), not `pg` directly
- No `any` types — use domain-specific types or `unknown` with guards

### Design Patterns
- Command/Handler pattern: one `ICommandHandler` class per command, registered with `CommandBus`
- Repository pattern — no raw SQL outside repository implementations
- Static factory methods over public constructors for aggregates (`static create`, `static reconstruct`)
- Strategy pattern for pluggable behaviours (e.g. notification channels)

### Testing
- Test files use `.spec.ts` extension — never `.test.ts`
- Spec files are co-located with their source (e.g. `Task.ts` and `Task.spec.ts` in the same directory)
- When adding tests for existing, already-correct code (no new behavior), write the test from the type signature and a prose description of intended behavior — never by reading the implementation first, and never from test code pasted into a plan. Run it before opening the source file.
- A test that fails at this stage is a real signal — either a misunderstood contract or an actual bug. Stop and report it; do not silently edit the test to match unread implementation.
- Plans must not pre-write finished test bodies for implementers to copy, and must not declare a blanket "no red phase" exemption.

### Express API Style (enforced on every route file)

> Full rules: [`docs/coding-standards/api-standard.md`](docs/coding-standards/api-standard.md)

Key rules — apply these without being asked:
- Wrap every async route handler with `asyncHandler` — never write manual try/catch in routes
- `err: unknown` in error middleware — narrow the type inside; never `any`
- `import type` for `Request`, `Response`, `NextFunction`, `RequestHandler` — they are type-only
- No `req`/`res`/`next` type annotations inside `asyncHandler` callbacks — types are inferred
- `AppError(message, statusCode)` for all thrown HTTP errors
- Validate request bodies with Zod at the route boundary before the handler
- Validate env vars with Zod at startup in `src/config/env.ts` — use `env.*` not `process.env.*`
- Graceful shutdown: handle `SIGTERM` / `SIGINT`, close server then pool
- All query routes prefixed `/api/v1/`; `/health` and `/commands` have no version prefix

### TypeScript Style (enforced on every file)

> Full rules: [`docs/coding-standards/typescript.md`](docs/coding-standards/typescript.md)

Key rules — apply these without being asked:
- `const` by default, `let` when reassignment needed, never `var`
- Named exports only — never `export default`
- `import type` for type-only imports
- `===` / `!==` always (only exception: `x == null`)
- Interfaces for object shapes; type aliases for unions/tuples/primitives
- Never `any` — use `unknown` with type guards at system boundaries
- `as` syntax for type assertions, never angle brackets; double-cast via `unknown`
- Function declarations for named functions; arrow functions for callbacks
- Parameter properties: `constructor(private readonly pool: Pool)`
- Throw `Error` instances only — never strings or plain objects
- Every `switch` must have a `default` case; no fall-through from non-empty cases
- Never use wrapper types: `String`, `Boolean`, `Number`
- Never `for...in` on arrays — use `for...of`
- Naming: `UpperCamelCase` types/classes, `lowerCamelCase` vars/functions, `CONSTANT_CASE` globals
- Treat acronyms as words: `PgEventStore` not `PGEventStore`, `loadHttpUrl` not `loadHTTPURL`
- Unused parameters prefixed with `_` (e.g. `_req`, `_next`); used parameters never prefixed with `_`

### What to avoid
- Anemic domain models (plain data bags with no behaviour)
- Business logic leaking into Express route handlers
- Aggregates importing from `pg`, `express`, or any framework