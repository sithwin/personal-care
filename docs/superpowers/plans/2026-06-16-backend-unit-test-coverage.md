# Backend Unit Test Coverage Plan (TDD-first)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

A coverage audit of `packages/backend/src` (the only package with real source + a test runner — `packages/frontend` and `packages/mcp` have no `src/` yet) found 31 files with real, testable logic and zero `.spec.ts` coverage: 26 application command handlers, plus `task-status.ts`, `app-error.ts`, `error-handler.ts`, `async-handler.ts`, and `projections/runner.ts`. (DB-touching infrastructure — `EventStore`, the 7 `Pg*ViewRepository`/7 `Pg*QueryService` files, `db/client.ts`, `db/migrate.ts`, the 5 remaining projectors, `seed.ts` — needs real-Postgres integration tests following the existing `tasks.projector.spec.ts` pattern, and is deliberately deferred to a follow-up plan so this one stays scoped to no-DB unit tests.)

The prior test-coverage plan (`docs/superpowers/plans/2026-06-16-api-route-test-coverage.md`) pasted a complete, pre-written test file into every task and told the implementer to "write it, run it, confirm it passes" — there was never a real RED phase, so `subagent-driven-development`'s default of "implementer subagents follow TDD" never actually kicked in despite being wired into that skill by default. This plan fixes that: every task describes a **behavioral contract**, not finished test code, and the policy is now codified in `CLAUDE.md`'s Testing section so the fix is durable across future plans, not just this one.

## Task 0: Add the retrofit-TDD policy to CLAUDE.md

- [x] **Done** — added three bullets to `CLAUDE.md`'s `### Testing` section describing the contract-first, no-pre-written-tests, real-RED-required policy. Committed separately from the test tasks below.

## TDD approach for this plan (apply to every task below)

Each task gives the implementer subagent a **contract** (signature + behavior in prose), not test code. The implementer must:
1. Write the test from the contract alone, without opening the source file under test.
2. Run it and observe the result before looking at the source.
3. If it fails: open the source, compare against the contract. If the code diverges from the documented contract, treat it as a possible bug — report via `DONE_WITH_CONCERNS` rather than silently changing the test's expectation. If the test itself had a setup mistake (wrong mock shape, typo), fix the test and rerun.
4. If it passes immediately: that's expected here (the code already exists and is presumed correct) — not a red flag in this retrofit context, unlike net-new TDD.
5. Commit only once the test passes for a reason you can explain.

## Canonical pattern: command handler tests

All 26 files in `packages/backend/src/application/command-handlers/**` share one of two shapes. Mock only `IEventStore` (`{ append: vi.fn(), getEvents: vi.fn(), getAllEventsSince: vi.fn() }` from `application/ports/IEventStore.ts`) — the aggregate classes are concrete, not injected, so use the real aggregate with a realistic event history built the same way the aggregate's own `*.spec.ts` does (e.g. `Task.spec.ts`'s `makeCreatedEvent` helper pattern).

**Shape A — Create** (`CreateBalanceRuleHandler`, `CreateCategoryHandler`, `CreateItemHandler`, `CreateTaskHandler`, `CreateProjectHandler`, `CreateResourceHandler`):
- Contract: `handle(cmd)` calls the aggregate's static `create`, then `eventStore.append([event], 0)`, and returns whatever `append` resolves to.
- Tests: (1) `append` is called with a one-element array and expected version `0`; (2) the handler's return value is exactly what `append` resolved to (pass-through, not transformed).

**Shape B — Mutate** (the other 20 files): `handle(cmd)` calls `eventStore.getEvents(id)`, reconstructs the aggregate, throws `Error('<Aggregate> not found')` if reconstruct returns null, otherwise calls one instance method and appends the result(s) with `expectedVersion = history.length`.
- Tests: (1) when `getEvents` resolves `[]`, `handle` rejects with the exact "not found" message and `append` is never called; (2) when `getEvents` resolves a realistic history, `append` is called with `expectedVersion` equal to the history length; (3) the returned value is what `append` resolved to.

Per-file specifics (aggregate, instance method, not-found message, single vs. multi-event return):

| File | Aggregate | Method | Not-found message | Returns |
|---|---|---|---|---|
| `balance-rule/CreateBalanceRuleHandler.ts` | BalanceRule | `create` (static) | — | single event |
| `balance-rule/UpdateBalanceRuleHandler.ts` | BalanceRule | `update` | `BalanceRule not found` | single event |
| `balance-rule/DeleteBalanceRuleHandler.ts` | BalanceRule | `delete` | `BalanceRule not found` | single event |
| `category/CreateCategoryHandler.ts` | Category | `create` (static) | — | single event |
| `category/UpdateCategoryHandler.ts` | Category | `update` | `Category not found` | single event |
| `category/DeleteCategoryHandler.ts` | Category | `delete` | `Category not found` | single event |
| `item/CreateItemHandler.ts` | Item | `create` (static) | — | single event |
| `item/MarkItemAvailableHandler.ts` | Item | `markAvailable` | `Item not found` | single event |
| `item/MarkItemConsumedHandler.ts` | Item | `markConsumed` | `Item not found` | single event |
| `item/MarkItemAvailableAgainHandler.ts` | Item | `markAvailableAgain` | `Item not found` | single event |
| `task/CreateTaskHandler.ts` | Task | `create` (static) | — | single event |
| `task/StartTaskHandler.ts` | Task | `start` | `Task not found` | single event |
| `task/CompleteTaskHandler.ts` | Task | `complete` | `Task not found` | **array of events** — also test that `append` receives all of them (e.g. when recurrence produces more than one) |
| `task/AddItemRequirementHandler.ts` | Task | `addItemRequirement` | `Task not found` | single event |
| `task/AttachResourceToTaskHandler.ts` | Task | `attachResource` | `Task not found` | single event |
| `task/DetachResourceFromTaskHandler.ts` | Task | `detachResource` | `Task not found` | single event |
| `task/SetTaskRecurrenceHandler.ts` | Task | `setRecurrence` | `Task not found` | single event |
| `task/SkipRecurrenceHandler.ts` | Task | `skipRecurrence` | `Task not found` | single event |
| `task/ScheduleTaskHandler.ts` | Task | `schedule` | `Task not found` | single event |
| `task/PromoteToProjectHandler.ts` | Task | `promoteToProject` | `Task not found` | single event |
| `project/CreateProjectHandler.ts` | Project | `create` (static) | — | single event |
| `project/AddTaskToProjectHandler.ts` | Project | `addTask` | `Project not found` | single event |
| `project/CompleteProjectHandler.ts` | Project | `complete` | `Project not found` | single event |
| `resource/CreateResourceHandler.ts` | Resource | `create` (static) | — | single event |
| `resource/UpdateResourceHandler.ts` | Resource | `update` | `Resource not found` | single event |
| `resource/DeleteResourceHandler.ts` | Resource | `delete` | `Resource not found` | single event |

## Tasks 1–26: one per command handler

For each row in the table above:

- [ ] **`balance-rule/CreateBalanceRuleHandler.ts`**
- [ ] **`balance-rule/UpdateBalanceRuleHandler.ts`**
- [ ] **`balance-rule/DeleteBalanceRuleHandler.ts`**
- [ ] **`category/CreateCategoryHandler.ts`**
- [ ] **`category/UpdateCategoryHandler.ts`**
- [ ] **`category/DeleteCategoryHandler.ts`**
- [ ] **`item/CreateItemHandler.ts`**
- [ ] **`item/MarkItemAvailableHandler.ts`**
- [ ] **`item/MarkItemConsumedHandler.ts`**
- [ ] **`item/MarkItemAvailableAgainHandler.ts`**
- [ ] **`task/CreateTaskHandler.ts`**
- [ ] **`task/StartTaskHandler.ts`**
- [ ] **`task/CompleteTaskHandler.ts`**
- [ ] **`task/AddItemRequirementHandler.ts`**
- [ ] **`task/AttachResourceToTaskHandler.ts`**
- [ ] **`task/DetachResourceFromTaskHandler.ts`**
- [ ] **`task/SetTaskRecurrenceHandler.ts`**
- [ ] **`task/SkipRecurrenceHandler.ts`**
- [ ] **`task/ScheduleTaskHandler.ts`**
- [ ] **`task/PromoteToProjectHandler.ts`**
- [ ] **`project/CreateProjectHandler.ts`**
- [ ] **`project/AddTaskToProjectHandler.ts`**
- [ ] **`project/CompleteProjectHandler.ts`**
- [ ] **`resource/CreateResourceHandler.ts`**
- [ ] **`resource/UpdateResourceHandler.ts`**
- [ ] **`resource/DeleteResourceHandler.ts`**

Each creates `packages/backend/src/application/command-handlers/<domain>/<Handler>.spec.ts`, co-located with `<Handler>.ts`.
- **Reference (read-only, open only after the first test run):** the handler file itself, the matching aggregate's existing `*.spec.ts` (for realistic event-history fixtures), `application/ports/IEventStore.ts`
- Apply Shape A or Shape B from the canonical pattern above, using the row's specifics
- Run: `npx vitest run <path>` from `packages/backend`
- Commit: `test: add coverage for <Handler>` after the test passes for an understood reason

## Task 27: `task-status.ts`

- [ ] **Write tests**

**File:** Create `packages/backend/src/application/services/task-status.spec.ts`
**Contract:** `deriveTaskStatus(task: TaskViewRow, itemStatuses: string[]): string` is a pure function returning one of `'done' | 'ongoing' | 'pending' | 'planned' | 'ready'`, applied in this priority order:
1. `'done'` if the task has a `completedAt` and no `recurrenceRule`
2. `'ongoing'` if the task has a `startedAt` and no `completedAt`
3. `'pending'` if any entry in `itemStatuses` equals `'to_buy'`
4. `'planned'` if `dueDate` is set and in the future
5. otherwise `'ready'`

Write one test per branch, including a case proving priority order (e.g. a task that is both started AND has a future due date should resolve `'ongoing'`, not `'planned'`). Run `npx vitest run src/application/services/task-status.spec.ts` from `packages/backend`. Commit: `test: add coverage for task-status service`.

## Task 28: `app-error.ts`

- [ ] **Write tests**

**File:** Create `packages/backend/src/api/errors/app-error.spec.ts`
**Contract:** `AppError` extends `Error`, constructed with `(message: string, statusCode: number)`. Verify: `name === 'AppError'`, `statusCode` is exposed and matches the constructor arg, `message` matches, and the instance is both `instanceof AppError` and `instanceof Error`.
Run `npx vitest run src/api/errors/app-error.spec.ts`. Commit: `test: add coverage for AppError`.

## Task 29: `error-handler.ts`

- [ ] **Write tests**

**File:** Create `packages/backend/src/api/middleware/error-handler.spec.ts`
**Contract:** `errorHandler(err, req, res, next)` is Express error middleware. It resolves an HTTP status from `err` — `AppError` → its own `statusCode`; a Postgres error (`code` property) of `'22P02'` → 400, `'23503'` → 409; otherwise by message substring: contains `'not found'` → 404, `'Concurrency'` → 409, `'Cannot delete'` → 400; anything else → 500. It responds with JSON `{ success: false, message }`, including a `stack` field only when `NODE_ENV !== 'production'` and `err` is an `Error` instance. Build a minimal mock `Request`/`Response` (vitest mock functions for `status().json()`) rather than booting a real Express app, since this is unit-level middleware logic.
Run `npx vitest run src/api/middleware/error-handler.spec.ts`. Commit: `test: add coverage for errorHandler`.

## Task 30: `async-handler.ts`

- [ ] **Write tests**

**File:** Create `packages/backend/src/api/utils/async-handler.spec.ts`
**Contract:** `asyncHandler(fn)` wraps an async Express route handler. If `fn`'s returned promise rejects, the wrapped function calls `next(error)` with that error. If `fn` resolves, `next` is never called.
Run `npx vitest run src/api/utils/async-handler.spec.ts`. Commit: `test: add coverage for asyncHandler`.

## Task 31: `infrastructure/projections/runner.ts`

- [ ] **Write tests**

**File:** Create `packages/backend/src/infrastructure/projections/runner.spec.ts`
**Contract:** `createProjectorRunner(projectors: Projector[])` returns a function `(events: StoredEvent[]) => Promise<void>` that, for each event in `events` (in order), awaits every projector in `projectors` (in order) before moving to the next event — i.e. fully sequential, not parallel, and every projector sees every event.
Tests: (1) with 2 events and 2 mock projectors, each projector is called once per event (4 calls total) with the right event each time; (2) calls happen in event-then-projector order (assert via call-order tracking, e.g. an array each mock pushes into).
Run `npx vitest run src/infrastructure/projections/runner.spec.ts`. Commit: `test: add coverage for projector runner`.

## Final step: full suite verification

- [ ] After all 31 tasks: run `npm test` from `packages/backend` and confirm every existing spec plus all 31 new ones pass with no errors/warnings.
