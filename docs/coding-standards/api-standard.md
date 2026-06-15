# Express API Standards

Derived from [Node.js API Best Practices for Production in 2026](https://usmannadeem.com/node-js-api-best-practices-for-production-in-2026/).  
Adapted to this project's Clean Architecture + CQRS + TypeScript setup.

---

## 1. Project Structure

Each layer has exactly one responsibility. Dependencies only point inward.

```
src/
├── domain/          # Aggregates, value objects, domain events (pure — no I/O)
├── application/     # Command handlers, query services, ports (interfaces only)
├── infrastructure/  # Pg implementations, Express wiring, logger, composition root
├── api/
│   ├── routes/      # Route definitions — thin; delegate to query/command services
│   ├── middleware/  # Auth, validation, error handling
│   └── utils/       # asyncHandler, response helpers
├── db/              # Migration runner, pg pool factory
├── seed/            # Seed script
└── index.ts         # Express setup only — no business logic
```

**Rules:**
- `index.ts` wires middleware and mounts routers — nothing else
- Route handlers delegate immediately to query/command services; no SQL, no business logic
- All concrete dependencies assembled in `infrastructure/composition-root.ts`

---

## 2. Async Route Handlers — `asyncHandler`

**Never** write try/catch boilerplate in every route handler.  
Wrap every async handler with `asyncHandler` so rejections flow to the centralized error middleware automatically.

```typescript
// src/api/utils/async-handler.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Usage in routes:**
```typescript
// ✅ DO — clean, rejection-safe
router.get('/:id', asyncHandler(async (req, res) => {
  const task = await queryService.getById(req.params.id);
  if (!task) throw new AppError('Task not found', 404);
  res.json(task);
}));

// ❌ DON'T — manual try/catch in every handler
router.get('/:id', async (req, res, next) => {
  try {
    const task = await queryService.getById(req.params.id);
    res.json(task);
  } catch (err) { next(err); }
});
```

---

## 3. Centralized Error Handling

Use a typed `AppError` class for all domain/application errors. The centralized error handler reads `statusCode` from it.

```typescript
// src/api/errors/app-error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**Error handler signature (Express 4):**
```typescript
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // ...
}
```

**Rules:**
- Single error handler registered last in `index.ts`
- Always `err: unknown` — narrow the type inside the handler
- Log 5xx as `error`, 4xx as `warn`
- Never expose stack traces in production responses
- `AppError` → use its `statusCode`; pg errors → map by `err.code`; everything else → 500

---

## 4. Input Validation

Validate all incoming data at the route boundary **before** the handler executes.  
Use Zod for schema validation.

```typescript
// Middleware pattern
import { z } from 'zod';
import { AppError } from '../errors/app-error';

export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}
```

**Applying in routes:**
```typescript
const createTaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
});

router.post('/', validate(createTaskSchema), asyncHandler(async (req, res) => {
  await bus.dispatch({ type: 'CreateTask', payload: req.body });
  res.status(201).json({ ok: true });
}));
```

**Rules:**
- Validate at the HTTP boundary — never in domain or application layer
- Return structured validation errors (400 with field-level detail)
- `req.body` is reassigned to the parsed (typed) result so handlers receive validated data
- Query params and path params also validated when they carry business meaning (e.g. UUIDs)

---

## 5. Security Layers

Apply in `index.ts` in this order:

```typescript
app.use(helmet());                      // HTTP security headers
app.use(cors({ origin: allowList }));   // CORS whitelist
app.use(rateLimiter);                   // Rate limiting
app.use(express.json({ limit: '10kb' })); // Body size cap
```

| Layer | Tool | Purpose |
|-------|------|---------|
| HTTP headers | `helmet` | XSS, clickjacking, MIME sniffing |
| Rate limiting | `express-rate-limit` | Brute force / DDoS |
| CORS | `cors` with whitelist | Cross-origin access control |
| Body size | `express.json({ limit })` | Prevent payload flooding |
| Input | Zod schema validation | Injection prevention |
| Secrets | Environment variables only | Never hardcode credentials |

---

## 6. Environment Validation

Validate all environment variables at process startup with Zod. Fail fast if any required variable is missing or invalid — the server must not start in a broken state.

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
});

export const env = envSchema.parse(process.env);
```

**Rules:**
- Parse at module load time — any error crashes startup immediately
- Use `env.*` throughout the codebase, never `process.env.*` directly
- `.env` files are local only — never commit to version control

---

## 7. Logging

Already uses Pino (the article's primary recommendation). Follow these rules:

```typescript
// ✅ DO — structured with context
logger.info({ userId, action: 'login' }, 'User authenticated');
logger.error({ err, aggregateId }, 'Failed to persist events');

// ❌ DON'T — unstructured strings
logger.info('User ' + userId + ' logged in');
logger.error('Error: ' + err.message);
```

**Rules:**
- Always pass a context object as the first argument
- `err` key for errors (Pino serialises it correctly)
- Module-level child loggers: `const log = childLogger('ModuleName')`
- JSON output in production; pretty-printed in development

---

## 8. Graceful Shutdown

Handle `SIGTERM` and `SIGINT` to drain in-flight requests and close the database pool cleanly before exiting. Essential for container restarts (Docker, Kubernetes).

```typescript
const server = app.listen(port, () => logger.info({ port }, 'Backend started'));

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close(async () => {
    await pool.end();
    logger.info('DB pool closed — exiting');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
```

---

## 9. API Versioning

Prefix all routes with `/api/v1/` from day one. This allows non-breaking evolution.

```typescript
app.use('/api/v1/tasks',      makeTasksRouter(deps.taskQueryService));
app.use('/api/v1/categories', makeCategoriesRouter(deps.categoryQueryService));
// ...
app.use('/commands',          makeCommandsRouter(deps.commandBus)); // internal — no version prefix
app.get('/health',            healthHandler);                        // infra — no version prefix
```

---

## 10. Health Check Endpoint

```typescript
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```

Always expose `/health` — load balancers and orchestrators depend on it.

---

## 11. TypeScript-Specific Express Patterns

### Import types, not values, for Express type annotations

```typescript
// ✅ DO
import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ❌ DON'T
import { Router, Request, Response, NextFunction } from 'express';
```

### Never annotate `req`/`res`/`next` when using `asyncHandler`

```typescript
// ✅ DO — types inferred from asyncHandler's signature
router.get('/', asyncHandler(async (req, res) => {
  res.json(await queryService.getAll());
}));

// ❌ DON'T — redundant annotations
router.get('/', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  res.json(await queryService.getAll());
}));
```

### Type `err` as `unknown` in error middleware

```typescript
// ✅ DO
function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const appErr = err instanceof AppError ? err : null;
  const status = appErr?.statusCode ?? 500;
  // ...
}

// ❌ DON'T — assumes structure without narrowing
function errorHandler(err: any, ...) {
  res.status(err.statusCode || 500).json({ error: err.message });
}
```

---

## 12. Production Readiness Checklist

- [ ] `asyncHandler` wraps all async route handlers — no manual try/catch
- [ ] `AppError` used for all thrown domain/HTTP errors
- [ ] Input validated with Zod at the route boundary
- [ ] Environment variables validated at startup (fail fast)
- [ ] `helmet`, `cors`, `express-rate-limit` configured in correct order
- [ ] Body size limited (`express.json({ limit: '10kb' })`)
- [ ] Structured logging (Pino) with context objects
- [ ] `/health` endpoint returns `{ ok, uptime, timestamp }`
- [ ] Graceful shutdown on `SIGTERM` / `SIGINT`
- [ ] All routes prefixed `/api/v1/` (except `/health` and `/commands`)
- [ ] `npm audit` passes — no critical vulnerabilities
- [ ] Happy-path + error-path tests for all critical endpoints
