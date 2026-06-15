# TypeScript Coding Standards

Derived from the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html).  
These rules apply to all TypeScript files in this project.

---

## Naming Conventions

| Construct | Style | Example |
|-----------|-------|---------|
| Class, Interface, Type, Enum, Decorator | `UpperCamelCase` | `TaskView`, `IEventStore` |
| Variable, Parameter, Function, Method, Property | `lowerCamelCase` | `aggregateId`, `getById()` |
| Global constant, Enum value, `static readonly` | `CONSTANT_CASE` | `MAX_RETRIES` |
| File | `kebab-case` | `task-query-service.ts` |
| Module alias | `lowerCamelCase` | `import * as taskUtils` |

- Treat acronyms as words: `loadHttpUrl` not `loadHTTPURL`, `PgTaskQueryService` not `PGTaskQueryService`
- No `_` prefix or suffix on private identifiers — use `private` keyword instead
- Single-letter variables only in scopes ≤ 10 lines
- Suffix `Observable` streams with `$` (optional but consistent within a module)

---

## Variables & Declarations

```typescript
// ✅ DO
const pool = new Pool();
let retries = 0;

// ❌ DON'T
var pool = new Pool();        // never var
let a = 1, b = 2;            // one declaration per statement
```

- Always `const` or `let`; never `var`
- `const` by default — only use `let` when the variable will be reassigned
- One variable per declaration statement

---

## Imports & Exports

```typescript
// ✅ DO
import { Pool } from 'pg';
import type { ITaskQueryService } from '../application/ports/ITaskQueryService';
export function makeTasksRouter(...) { ... }
export interface TaskView { ... }

// ❌ DON'T
import Pool from 'pg';                 // no default imports
export default function router() {}    // no default exports
export let mutableValue = 0;           // no mutable exports
```

- **Named exports only** — never `export default`
- `import type` for type-only imports (keeps runtime output clean)
- Relative imports (`./foo`) within the project
- Never `export let` — exported values must be `const` or immutable

---

## Functions

```typescript
// ✅ DO — function declaration for named functions
function buildDependencies(pool: Pool): AppDependencies { ... }

// ✅ DO — arrow functions for callbacks
const sorted = tasks.sort((a, b) => a.name.localeCompare(b.name));

// ❌ DON'T — function expressions
const buildDependencies = function(pool: Pool) { ... };

// ❌ DON'T — named callbacks (unexpected extra args)
['1', '2'].map(parseInt);  // parseInt receives index as radix
['1', '2'].map(n => parseInt(n, 10));  // ✅
```

- **Function declarations** for named, top-level functions
- **Arrow functions** for all callbacks and inline functions
- Use rest parameters (`...args`) over `arguments`
- No blank lines at function body start or end

### Unused Parameters

Prefix unused parameters with `_`. Used parameters must **not** have the prefix.

```typescript
// ✅ DO — _req signals intentionally unused; req signals actively read
router.get('/rules', asyncHandler(async (_req, res) => {
  res.json(await queryService.getRules());
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await queryService.getById(req.params.id);
  res.json(item);
}));

// ✅ DO — _next in error middleware (required positionally by Express)
function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void { ... }

// ❌ DON'T — naming a used parameter with _
router.get('/:id', asyncHandler(async (_req, res) => {
  const id = _req.params.id; // misleading — param IS used
}));

// ❌ DON'T — naming an unused parameter without _
router.get('/all', asyncHandler(async (req, res) => {
  res.json(await queryService.getAll()); // req never read — should be _req
}));
```

This rule applies everywhere: route handlers, class methods, standalone functions, and callbacks.

---

## Classes

```typescript
// ✅ DO
class PgTaskQueryService implements ITaskQueryService {
  constructor(private readonly pool: Pool) {}
  // ...
}

// ❌ DON'T
class PgTaskQueryService {
  private pool: Pool;
  constructor(pool: Pool) {
    this.pool = pool;  // use parameter properties instead
  }
}
```

- Use **parameter properties**: `constructor(private readonly pool: Pool)`
- Mark fields `readonly` when never reassigned after construction
- No `public` modifier except for non-readonly constructor parameter properties
- Never use private fields (`#ident`) — use TypeScript `private` keyword
- No trailing semicolons after class bodies

---

## Type System

### Interfaces vs. Type Aliases

```typescript
// ✅ DO — interface for object shapes
interface TaskView {
  id: string;
  name: string;
  status: string;
}

// ✅ DO — type alias for unions, tuples, primitives
type TaskStatus = 'ready' | 'ongoing' | 'pending' | 'planned' | 'done';
type UUID = string;

// ❌ DON'T — type alias for plain object shapes
type TaskView = { id: string; name: string };
```

### `any` vs. `unknown`

```typescript
// ✅ DO
function parsePayload(raw: unknown): TaskPayload {
  if (!isTaskPayload(raw)) throw new Error('Invalid payload');
  return raw;
}

// ❌ DON'T
function parsePayload(raw: any): TaskPayload { return raw; }
```

- Never use `any` — use `unknown` with type guards at boundaries
- Suppress lint warnings with an explanatory comment when `any` is truly unavoidable
- Never use `{}` as a type — use `unknown`, `object`, or `Record<string, T>`
- Never use wrapper types: `String`, `Boolean`, `Number` — use `string`, `boolean`, `number`

### Type Assertions

```typescript
// ✅ DO
const anyCommand = command as unknown as AnyCommand;

// ❌ DON'T
const anyCommand = <AnyCommand>command;   // angle-bracket syntax
```

- Use `as` syntax, never angle brackets
- Double-assert through `unknown`: `x as unknown as Foo`
- Add a comment when the assertion is non-obvious

### Nullable Types

```typescript
// ✅ DO
interface TaskView { dueDate: string | null; }
function getById(id: string): Promise<TaskView | null>

// ❌ DON'T — don't include null in type aliases
type NullableString = string | null;
```

- Express nullability with union types at the usage site, not in aliases
- Prefer `?` (optional) over `| undefined` for optional parameters/fields

---

## Arrays

```typescript
// ✅ DO
const copy = [...original];
const ids: string[] = [];
const matrix: number[][] = [];
const complex: Array<string | number> = [];

// ❌ DON'T
const arr = new Array(3);       // no Array() constructor
```

- Prefer `T[]` for simple types; `Array<T>` for complex/union types
- Use spread `[...foo]` for shallow copies

---

## Objects

```typescript
// ✅ DO
const copy = { ...original, name: 'new' };
for (const [key, value] of Object.entries(obj)) { ... }

// ❌ DON'T
const obj = new Object();       // no Object constructor
for (const key in obj) { ... }  // no unfiltered for...in
```

- Use `for...of Object.keys/values/entries()` — never unfiltered `for...in`
- Prefer `Map`/`Set` over plain objects for dynamic key-value stores

---

## Control Flow

```typescript
// ✅ DO
if (condition) {
  doSomething();
}

// ✅ DO — only exception: single-line if
if (condition) return;

// ❌ DON'T
if (condition)
  doSomething();    // always use braces for multi-line
```

- All control flow statements use braced blocks
- **Always** `===` and `!==` (exception: `x == null` checks both null and undefined)
- No `switch` fall-through from non-empty cases — always `break`/`return`/`throw`
- Every `switch` must have a `default` case

---

## Error Handling

```typescript
// ✅ DO
throw new Error('Concurrency conflict on aggregate abc at version 3');

class ConcurrencyError extends Error {
  constructor(aggregateId: string, version: number) {
    super(`Concurrency conflict on ${aggregateId} at version ${version}`);
    this.name = 'ConcurrencyError';
  }
}

// ❌ DON'T
throw 'something went wrong';   // only throw Error instances
throw { message: 'oops' };
```

- Always throw `Error` instances (or subclasses) — never strings or plain objects
- Use custom error subclasses to attach structured data (aggregate ID, version, etc.)
- Empty catch blocks must have an explanatory comment
- Keep try blocks narrow — move non-throwable lines outside

---

## Comments & Documentation

```typescript
// ✅ DO — JSDoc for public API
/**
 * Returns all tasks matching the given filter.
 * Returns an empty array when no tasks match.
 */
async getAll(filter: TaskFilter): Promise<TaskView[]>

// ✅ DO — line comment for implementation detail
// PostgreSQL 22P02 means invalid UUID format — map to 400
if (err.code === '22P02') return 400;

// ❌ DON'T — comment that just restates the code
// Append new events to the array
stored.push(result.rows[0]);
```

- `/** JSDoc */` for exported functions, classes, and interfaces
- `//` for implementation details — never `/* */` for multi-line comments
- No comments that simply restate what the code does
- No trailing comments on the same line as code

---

## Disallowed Features

| Feature | Alternative |
|---------|-------------|
| `var` | `const` / `let` |
| `eval()` | None — redesign |
| `with` | None — prohibited |
| `parseInt` (base-10) | `Number()` |
| Unary `+str` | `Number(str)` |
| `new String()` / `new Boolean()` / `new Number()` | `string` / `boolean` / `number` |
| Default exports | Named exports |
| `export let` | `export const` |
| `for...in` on arrays | `for...of` |
| Angle-bracket type assertions | `as` keyword |
| `const enum` | Plain `enum` |
| Modifying built-in prototypes | None |
| `debugger` in committed code | Remove before commit |
