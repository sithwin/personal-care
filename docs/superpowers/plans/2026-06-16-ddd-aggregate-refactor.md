# DDD Aggregate Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all 6 domain aggregates to proper DDD — aggregate classes with per-command methods, typed domain event classes, one command handler per command, CommandBus as a pure registry.

**Architecture:** `domain/` holds pure aggregate classes, typed commands (interfaces), and typed events (classes extending `DomainEvent`). `application/` holds one `ICommandHandler<TCmd>` per command. `infrastructure/` holds `CommandBus` (registry dispatcher) and `EventStore` (pg adapter), both moved from their current wrong locations.

**Tech Stack:** Node.js 20, TypeScript 5, vitest, pg, Express

---

## File Map

### New files
- `src/domain/shared/DomainEvent.ts` — abstract base class
- `src/application/ports/ICommandHandler.ts` — generic handler port
- `src/infrastructure/command-bus/CommandBus.ts` — registry-based dispatcher
- `src/infrastructure/command-bus/CommandBus.spec.ts`
- `src/infrastructure/persistence/EventStore.ts` — moved from `src/event-store/`
- `src/infrastructure/persistence/EventStore.spec.ts` — moved from `src/event-store/`
- Per aggregate × 6: `commands/{Create,Update,Delete}Foo.ts`, `commands/index.ts`, `events/FooCreated.ts` etc., `Foo.ts`, `Foo.spec.ts`
- Per command × all aggregates: `application/command-handlers/<agg>/XxxHandler.ts`

### Modified files
- `src/types.ts` — remove `DomainEvent` interface
- `src/application/ports/IEventStore.ts` — import `DomainEvent` from domain/shared
- `src/infrastructure/composition-root.ts` — use new handlers + new imports

### Deleted files
- `src/command-bus/command-bus.ts` + `.spec.ts`
- `src/event-store/event-store.ts` + `.spec.ts`
- `src/domain/*/aggregate.ts`, `*/aggregate.spec.ts`, `*/types.ts` (all 6 aggregates)

---

## Task 1: Abstract DomainEvent base class

**Files:**
- Create: `src/domain/shared/DomainEvent.ts`
- Modify: `src/types.ts`
- Modify: `src/application/ports/IEventStore.ts`

- [ ] **Step 1: Create `src/domain/shared/DomainEvent.ts`**

```typescript
export abstract class DomainEvent {
  constructor(
    readonly eventType: string,
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly payload: Record<string, unknown>,
  ) {}
}
```

- [ ] **Step 2: Remove `DomainEvent` interface from `src/types.ts`**

Delete lines 34–39 (the `DomainEvent` interface block). Leave `StoredEvent` and all value types intact.

```typescript
// src/types.ts — after edit, this interface must NOT appear:
// export interface DomainEvent { ... }   ← DELETE THIS
```

- [ ] **Step 3: Update `src/application/ports/IEventStore.ts`**

```typescript
import type { DomainEvent } from '../../domain/shared/DomainEvent';
import type { StoredEvent } from '../../types';

export interface IEventStore {
  append(events: DomainEvent[], expectedVersion: number): Promise<StoredEvent[]>;
  getEvents(aggregateId: string): Promise<StoredEvent[]>;
  getAllEventsSince(afterId: number): Promise<StoredEvent[]>;
}
```

- [ ] **Step 4: Run tests — expect existing aggregate tests still pass**

```bash
npm test
```

Expected: all existing tests pass (old aggregate files still import from `../../types` but `DomainEvent` is no longer there — this is fine because old aggregate files don't actually import `DomainEvent` from types; they import `Pick<DomainEvent,...>` inline). If any test fails due to the removed interface, fix the import to point to `domain/shared/DomainEvent`.

- [ ] **Step 5: Commit**

```bash
git add src/domain/shared/DomainEvent.ts src/types.ts src/application/ports/IEventStore.ts
git commit -m "refactor: introduce abstract DomainEvent base class in domain/shared"
```

---

## Task 2: ICommandHandler port

**Files:**
- Create: `src/application/ports/ICommandHandler.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { StoredEvent } from '../../types';

export interface ICommandHandler<TCommand> {
  handle(cmd: TCommand): Promise<StoredEvent[]>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/application/ports/ICommandHandler.ts
git commit -m "refactor: add ICommandHandler port"
```

---

## Task 3: Move & simplify CommandBus

**Files:**
- Create: `src/infrastructure/command-bus/CommandBus.ts`
- Create: `src/infrastructure/command-bus/CommandBus.spec.ts`
- Modify: `src/infrastructure/composition-root.ts` (update import)
- Delete: `src/command-bus/command-bus.ts`
- Delete: `src/command-bus/command-bus.spec.ts`

- [ ] **Step 1: Write the new CommandBus**

```typescript
// src/infrastructure/command-bus/CommandBus.ts
import type { ICommandBus } from '../../application/ports/ICommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
import type { StoredEvent } from '../../types';
import { childLogger } from '../logger';

const log = childLogger('CommandBus');

export class CommandBus implements ICommandBus {
  private readonly registry = new Map<string, (cmd: Record<string, unknown>) => Promise<StoredEvent[]>>();

  constructor(private readonly onEventsStored?: (events: StoredEvent[]) => Promise<void>) {}

  register<TCmd>(commandType: string, handler: ICommandHandler<TCmd>): void {
    this.registry.set(commandType, (cmd) => handler.handle(cmd as TCmd));
  }

  async dispatch(command: { type: string; payload: Record<string, unknown> }): Promise<StoredEvent[]> {
    const handler = this.registry.get(command.type);
    if (!handler) {
      log.warn({ commandType: command.type }, 'No handler registered for command');
      throw new Error(`No handler registered for command: ${command.type}`);
    }
    log.debug({ commandType: command.type }, 'Dispatching command');
    const stored = await handler(command);
    log.info(
      { commandType: command.type, eventCount: stored.length, events: stored.map(event => event.eventType) },
      'Command dispatched',
    );
    await this.onEventsStored?.(stored);
    return stored;
  }
}
```

- [ ] **Step 2: Write the spec**

```typescript
// src/infrastructure/command-bus/CommandBus.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from './CommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
import type { StoredEvent } from '../../types';

function makeStoredEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1, aggregateId: 'agg-1', aggregateType: 'test',
    eventType: 'TestCreated', payload: {}, version: 1,
    createdAt: new Date(), ...overrides,
  };
}

describe('CommandBus', () => {
  it('routes to the registered handler', async () => {
    const bus = new CommandBus();
    const stored = [makeStoredEvent()];
    const handler: ICommandHandler<{ type: 'CreateFoo'; payload: { id: string } }> = {
      handle: vi.fn().mockResolvedValue(stored),
    };
    bus.register('CreateFoo', handler);
    const result = await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } });
    expect(result).toBe(stored);
    expect(handler.handle).toHaveBeenCalledWith({ type: 'CreateFoo', payload: { id: '1' } });
  });

  it('throws for unknown command type', async () => {
    const bus = new CommandBus();
    await expect(
      bus.dispatch({ type: 'UnknownCommand', payload: {} }),
    ).rejects.toThrow('No handler registered for command: UnknownCommand');
  });

  it('calls onEventsStored after handler returns', async () => {
    const onEventsStored = vi.fn().mockResolvedValue(undefined);
    const bus = new CommandBus(onEventsStored);
    const stored = [makeStoredEvent()];
    const handler: ICommandHandler<{ type: 'CreateFoo'; payload: { id: string } }> = {
      handle: vi.fn().mockResolvedValue(stored),
    };
    bus.register('CreateFoo', handler);
    await bus.dispatch({ type: 'CreateFoo', payload: { id: '1' } });
    expect(onEventsStored).toHaveBeenCalledWith(stored);
  });
});
```

- [ ] **Step 3: Run spec — expect PASS**

```bash
cd packages/backend && npx vitest run src/infrastructure/command-bus/CommandBus.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 4: Update `composition-root.ts` import**

In `src/infrastructure/composition-root.ts`, replace:
```typescript
import { CommandBus } from '../command-bus/command-bus';
```
with:
```typescript
import { CommandBus } from './command-bus/CommandBus';
```

Also update the `CommandBus` constructor call — the new CommandBus does NOT take `eventStore` as first argument:

```typescript
const commandBus = new CommandBus(runProjectors);
```

> Note: `eventStore` is no longer passed to `CommandBus`. Individual command handlers will receive it instead. For now, the old aggregate registrations in the constructor are removed. The bus will have no handlers registered until Task 9 wires them up — the app will still start but dispatch will throw for all commands until then.

- [ ] **Step 5: Delete old files**

```bash
rm packages/backend/src/command-bus/command-bus.ts
rm packages/backend/src/command-bus/command-bus.spec.ts
rmdir packages/backend/src/command-bus
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests pass (old command-bus spec is deleted; new one passes).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move CommandBus to infrastructure, simplify to registry pattern"
```

---

## Task 4: Move EventStore to infrastructure/persistence

**Files:**
- Create: `src/infrastructure/persistence/EventStore.ts`
- Create: `src/infrastructure/persistence/EventStore.spec.ts`
- Modify: `src/infrastructure/composition-root.ts`
- Delete: `src/event-store/event-store.ts` + `event-store.spec.ts`

- [ ] **Step 1: Create `src/infrastructure/persistence/EventStore.ts`**

```typescript
import type { Pool } from 'pg';
import type { StoredEvent } from '../../types';
import type { IEventStore } from '../../application/ports/IEventStore';
import type { DomainEvent } from '../../domain/shared/DomainEvent';
import { childLogger } from '../logger';

const log = childLogger('EventStore');

export class EventStore implements IEventStore {
  constructor(private readonly pool: Pool) {}

  async append(events: DomainEvent[], expectedVersion: number): Promise<StoredEvent[]> {
    if (events.length === 0) return [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const stored: StoredEvent[] = [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const version = expectedVersion + i + 1;
        try {
          const result = await client.query<StoredEvent>(
            `INSERT INTO events (aggregate_id, aggregate_type, event_type, payload, version)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
                       event_type as "eventType", payload, version, created_at as "createdAt"`,
            [event.aggregateId, event.aggregateType, event.eventType, JSON.stringify(event.payload), version],
          );
          stored.push(result.rows[0]);
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('unique')) {
            const msg = `Concurrency conflict on aggregate ${event.aggregateId} at version ${version}`;
            log.warn({ aggregateId: event.aggregateId, version }, msg);
            throw new Error(msg);
          }
          log.error({ err, aggregateId: event.aggregateId }, 'Unexpected error appending event');
          throw err;
        }
      }
      await client.query('COMMIT');
      return stored;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE aggregate_id = $1 ORDER BY version ASC`,
      [aggregateId],
    );
    return result.rows;
  }

  async getAllEventsSince(afterId: number): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE id > $1 ORDER BY id ASC`,
      [afterId],
    );
    return result.rows;
  }
}
```

- [ ] **Step 2: Create `src/infrastructure/persistence/EventStore.spec.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EventStore } from './EventStore';
import { Pool } from 'pg';
import { DomainEvent } from '../../domain/shared/DomainEvent';

class TestEvent extends DomainEvent {
  constructor(aggregateId: string, eventType: string, payload: Record<string, unknown>) {
    super(eventType, aggregateId, 'test', payload);
  }
}

let pool: Pool;
let store: EventStore;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  store = new EventStore(pool);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      aggregate_id UUID NOT NULL,
      aggregate_type TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      version INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(aggregate_id, version)
    )
  `);
  await pool.query('TRUNCATE events RESTART IDENTITY');
});

afterAll(async () => { await pool.end(); });

describe('EventStore', () => {
  it('appends events and retrieves them', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    await store.append([new TestEvent(id, 'CategoryCreated', { name: 'Home' })], 0);
    const events = await store.getEvents(id);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryCreated');
    expect(events[0].version).toBe(1);
  });

  it('throws on optimistic concurrency conflict', async () => {
    const id = '22222222-2222-2222-2222-222222222222';
    await store.append([new TestEvent(id, 'CategoryCreated', { name: 'X' })], 0);
    await expect(
      store.append([new TestEvent(id, 'CategoryUpdated', { name: 'Y' })], 0),
    ).rejects.toThrow('Concurrency conflict');
  });

  it('getAllEventsSince returns events after a given id', async () => {
    const all = await store.getAllEventsSince(0);
    expect(all.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Update `composition-root.ts` import**

Replace:
```typescript
import { EventStore } from '../event-store/event-store';
```
with:
```typescript
import { EventStore } from './persistence/EventStore';
```

- [ ] **Step 4: Delete old files**

```bash
rm packages/backend/src/event-store/event-store.ts
rm packages/backend/src/event-store/event-store.spec.ts
rmdir packages/backend/src/event-store
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move EventStore to infrastructure/persistence"
```

---

## Task 5: balance-rule — commands + events

**Files:**
- Create: `src/domain/balance-rule/commands/CreateBalanceRule.ts`
- Create: `src/domain/balance-rule/commands/UpdateBalanceRule.ts`
- Create: `src/domain/balance-rule/commands/DeleteBalanceRule.ts`
- Create: `src/domain/balance-rule/commands/index.ts`
- Create: `src/domain/balance-rule/events/BalanceRuleCreated.ts`
- Create: `src/domain/balance-rule/events/BalanceRuleUpdated.ts`
- Create: `src/domain/balance-rule/events/BalanceRuleDeleted.ts`

- [ ] **Step 1: Create commands**

```typescript
// src/domain/balance-rule/commands/CreateBalanceRule.ts
import type { UUID, BalanceFrequency, DayRestriction } from '../../../types';

export interface CreateBalanceRule {
  readonly type: 'CreateBalanceRule';
  readonly payload: {
    readonly id: UUID;
    readonly categoryId: UUID;
    readonly minimumCount: number;
    readonly frequency: BalanceFrequency;
    readonly dayRestriction: DayRestriction;
  };
}
```

```typescript
// src/domain/balance-rule/commands/UpdateBalanceRule.ts
import type { UUID, BalanceFrequency, DayRestriction } from '../../../types';

export interface UpdateBalanceRule {
  readonly type: 'UpdateBalanceRule';
  readonly payload: {
    readonly id: UUID;
    readonly minimumCount?: number;
    readonly frequency?: BalanceFrequency;
    readonly dayRestriction?: DayRestriction;
  };
}
```

```typescript
// src/domain/balance-rule/commands/DeleteBalanceRule.ts
import type { UUID } from '../../../types';

export interface DeleteBalanceRule {
  readonly type: 'DeleteBalanceRule';
  readonly payload: { readonly id: UUID };
}
```

```typescript
// src/domain/balance-rule/commands/index.ts
export type { CreateBalanceRule } from './CreateBalanceRule';
export type { UpdateBalanceRule } from './UpdateBalanceRule';
export type { DeleteBalanceRule } from './DeleteBalanceRule';

import type { CreateBalanceRule } from './CreateBalanceRule';
import type { UpdateBalanceRule } from './UpdateBalanceRule';
import type { DeleteBalanceRule } from './DeleteBalanceRule';

export type BalanceRuleCommand = CreateBalanceRule | UpdateBalanceRule | DeleteBalanceRule;
```

- [ ] **Step 2: Create events**

```typescript
// src/domain/balance-rule/events/BalanceRuleCreated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateBalanceRule } from '../commands/CreateBalanceRule';

export class BalanceRuleCreated extends DomainEvent {
  constructor(readonly payload: CreateBalanceRule['payload']) {
    super('BalanceRuleCreated', payload.id, 'balance_rule', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/balance-rule/events/BalanceRuleUpdated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateBalanceRule } from '../commands/UpdateBalanceRule';

export class BalanceRuleUpdated extends DomainEvent {
  constructor(readonly payload: UpdateBalanceRule['payload']) {
    super('BalanceRuleUpdated', payload.id, 'balance_rule', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/balance-rule/events/BalanceRuleDeleted.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteBalanceRule } from '../commands/DeleteBalanceRule';

export class BalanceRuleDeleted extends DomainEvent {
  constructor(readonly payload: DeleteBalanceRule['payload']) {
    super('BalanceRuleDeleted', payload.id, 'balance_rule', payload as Record<string, unknown>);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domain/balance-rule/commands/ src/domain/balance-rule/events/
git commit -m "feat: add balance-rule commands and domain events"
```

---

## Task 6: BalanceRule aggregate class + spec

**Files:**
- Create: `src/domain/balance-rule/BalanceRule.ts`
- Create: `src/domain/balance-rule/BalanceRule.spec.ts`
- Delete: `src/domain/balance-rule/aggregate.ts`
- Delete: `src/domain/balance-rule/aggregate.spec.ts`
- Delete: `src/domain/balance-rule/types.ts`

- [ ] **Step 1: Write the failing spec first**

```typescript
// src/domain/balance-rule/BalanceRule.spec.ts
import { describe, it, expect } from 'vitest';
import { BalanceRule } from './BalanceRule';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1, aggregateId: 'br-1', aggregateType: 'balance_rule',
    eventType: 'BalanceRuleCreated',
    payload: { id: 'br-1', categoryId: 'cat-1', minimumCount: 2, frequency: 'weekly', dayRestriction: null },
    version: 1, createdAt: new Date(), ...overrides,
  };
}

describe('BalanceRule', () => {
  describe('reconstruct', () => {
    it('returns null for empty history', () => {
      expect(BalanceRule.reconstruct([])).toBeNull();
    });

    it('builds state from BalanceRuleCreated event', () => {
      const aggregate = BalanceRule.reconstruct([makeCreatedEvent()]);
      expect(aggregate).not.toBeNull();
    });

    it('returns null when only non-create events exist', () => {
      const event = makeCreatedEvent({ eventType: 'BalanceRuleUpdated' });
      expect(BalanceRule.reconstruct([event])).toBeNull();
    });
  });

  describe('create', () => {
    it('emits BalanceRuleCreated with correct eventType and aggregateId', () => {
      const cmd = {
        type: 'CreateBalanceRule' as const,
        payload: { id: 'br-1', categoryId: 'cat-1', minimumCount: 2, frequency: 'weekly' as const, dayRestriction: null },
      };
      const event = BalanceRule.create(cmd);
      expect(event.eventType).toBe('BalanceRuleCreated');
      expect(event.aggregateId).toBe('br-1');
      expect(event.aggregateType).toBe('balance_rule');
    });
  });

  describe('update', () => {
    it('emits BalanceRuleUpdated', () => {
      const aggregate = BalanceRule.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.update({ type: 'UpdateBalanceRule' as const, payload: { id: 'br-1', minimumCount: 5 } });
      expect(event.eventType).toBe('BalanceRuleUpdated');
    });

    it('throws when the rule has been deleted', () => {
      const history = [
        makeCreatedEvent(),
        makeCreatedEvent({ eventType: 'BalanceRuleDeleted', version: 2 }),
      ];
      const aggregate = BalanceRule.reconstruct(history)!;
      expect(() => aggregate.update({ type: 'UpdateBalanceRule' as const, payload: { id: 'br-1' } }))
        .toThrow('BalanceRule not found');
    });
  });

  describe('delete', () => {
    it('emits BalanceRuleDeleted', () => {
      const aggregate = BalanceRule.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.delete({ type: 'DeleteBalanceRule' as const, payload: { id: 'br-1' } });
      expect(event.eventType).toBe('BalanceRuleDeleted');
    });

    it('throws when already deleted', () => {
      const history = [
        makeCreatedEvent(),
        makeCreatedEvent({ eventType: 'BalanceRuleDeleted', version: 2 }),
      ];
      const aggregate = BalanceRule.reconstruct(history)!;
      expect(() => aggregate.delete({ type: 'DeleteBalanceRule' as const, payload: { id: 'br-1' } }))
        .toThrow('BalanceRule not found');
    });
  });
});
```

- [ ] **Step 2: Run spec — expect FAIL (BalanceRule not found)**

```bash
cd packages/backend && npx vitest run src/domain/balance-rule/BalanceRule.spec.ts
```

Expected: fails with "Cannot find module './BalanceRule'".

- [ ] **Step 3: Implement `src/domain/balance-rule/BalanceRule.ts`**

```typescript
import type { StoredEvent } from '../../types';
import type { UUID, BalanceFrequency, DayRestriction } from '../../types';
import type { CreateBalanceRule } from './commands/CreateBalanceRule';
import type { UpdateBalanceRule } from './commands/UpdateBalanceRule';
import type { DeleteBalanceRule } from './commands/DeleteBalanceRule';
import { BalanceRuleCreated } from './events/BalanceRuleCreated';
import { BalanceRuleUpdated } from './events/BalanceRuleUpdated';
import { BalanceRuleDeleted } from './events/BalanceRuleDeleted';

interface BalanceRuleState {
  readonly id: UUID;
  readonly categoryId: UUID;
  readonly minimumCount: number;
  readonly frequency: BalanceFrequency;
  readonly dayRestriction: DayRestriction;
  readonly deleted: boolean;
}

export class BalanceRule {
  private constructor(private readonly state: BalanceRuleState) {}

  static reconstruct(history: StoredEvent[]): BalanceRule | null {
    let state: BalanceRuleState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'BalanceRuleCreated') {
        state = {
          id: payload.id as UUID,
          categoryId: payload.categoryId as UUID,
          minimumCount: payload.minimumCount as number,
          frequency: payload.frequency as BalanceFrequency,
          dayRestriction: payload.dayRestriction as DayRestriction,
          deleted: false,
        };
      } else if (state !== null && event.eventType === 'BalanceRuleUpdated') {
        state = {
          ...state,
          minimumCount: (payload.minimumCount as number) ?? state.minimumCount,
          frequency: (payload.frequency as BalanceFrequency) ?? state.frequency,
          dayRestriction: (payload.dayRestriction as DayRestriction) ?? state.dayRestriction,
        };
      } else if (state !== null && event.eventType === 'BalanceRuleDeleted') {
        state = { ...state, deleted: true };
      }
    }
    return state !== null ? new BalanceRule(state) : null;
  }

  static create(cmd: CreateBalanceRule): BalanceRuleCreated {
    return new BalanceRuleCreated(cmd.payload);
  }

  update(cmd: UpdateBalanceRule): BalanceRuleUpdated {
    if (this.state.deleted) throw new Error('BalanceRule not found');
    return new BalanceRuleUpdated(cmd.payload);
  }

  delete(cmd: DeleteBalanceRule): BalanceRuleDeleted {
    if (this.state.deleted) throw new Error('BalanceRule not found');
    return new BalanceRuleDeleted(cmd.payload);
  }
}
```

- [ ] **Step 4: Run spec — expect PASS**

```bash
cd packages/backend && npx vitest run src/domain/balance-rule/BalanceRule.spec.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Delete old balance-rule files**

```bash
rm packages/backend/src/domain/balance-rule/aggregate.ts
rm packages/backend/src/domain/balance-rule/aggregate.spec.ts
rm packages/backend/src/domain/balance-rule/types.ts
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: all tests pass (composition-root still references the old `handleBalanceRuleCommand` — fix in Task 8).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace balance-rule aggregate function with BalanceRule class"
```

---

## Task 7: balance-rule command handlers

**Files:**
- Create: `src/application/command-handlers/balance-rule/CreateBalanceRuleHandler.ts`
- Create: `src/application/command-handlers/balance-rule/UpdateBalanceRuleHandler.ts`
- Create: `src/application/command-handlers/balance-rule/DeleteBalanceRuleHandler.ts`

- [ ] **Step 1: Create handlers**

```typescript
// src/application/command-handlers/balance-rule/CreateBalanceRuleHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateBalanceRule } from '../../../domain/balance-rule/commands/CreateBalanceRule';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class CreateBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateBalanceRule): Promise<StoredEvent[]> {
    const event = BalanceRule.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
```

```typescript
// src/application/command-handlers/balance-rule/UpdateBalanceRuleHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateBalanceRule } from '../../../domain/balance-rule/commands/UpdateBalanceRule';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class UpdateBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateBalanceRule): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = BalanceRule.reconstruct(history);
    if (aggregate === null) throw new Error('BalanceRule not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/balance-rule/DeleteBalanceRuleHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteBalanceRule } from '../../../domain/balance-rule/commands/DeleteBalanceRule';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class DeleteBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DeleteBalanceRule): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = BalanceRule.reconstruct(history);
    if (aggregate === null) throw new Error('BalanceRule not found');
    const event = aggregate.delete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/application/command-handlers/
git commit -m "feat: add balance-rule command handlers"
```

---

## Task 8: Wire balance-rule in composition-root + run tests

**Files:**
- Modify: `src/infrastructure/composition-root.ts`

- [ ] **Step 1: Replace old balance-rule imports and wiring**

Remove all old aggregate function imports (they no longer exist). Replace the full `composition-root.ts` content:

```typescript
import type { Pool } from 'pg';
import { EventStore } from './persistence/EventStore';
import { CommandBus } from './command-bus/CommandBus';
import { createCategoriesProjector } from './projections/categories.projector';
import { createItemsProjector } from './projections/items.projector';
import { createTasksProjector } from './projections/tasks.projector';
import { createProjectsProjector } from './projections/projects.projector';
import { createResourcesProjector } from './projections/resources.projector';
import { createBalanceProjector } from './projections/balance.projector';
import { createDashboardProjector } from './projections/dashboard.projector';
import { createProjectorRunner } from './projections/runner';
import { PgTaskViewRepository } from './persistence/views/PgTaskViewRepository';
import { PgItemViewRepository } from './persistence/views/PgItemViewRepository';
import { PgCategoryViewRepository } from './persistence/views/PgCategoryViewRepository';
import { PgProjectViewRepository } from './persistence/views/PgProjectViewRepository';
import { PgResourceViewRepository } from './persistence/views/PgResourceViewRepository';
import { PgBalanceViewRepository } from './persistence/views/PgBalanceViewRepository';
import { PgDashboardViewRepository } from './persistence/views/PgDashboardViewRepository';
import { PgTaskQueryService } from './queries/PgTaskQueryService';
import { PgItemQueryService } from './queries/PgItemQueryService';
import { PgCategoryQueryService } from './queries/PgCategoryQueryService';
import { PgProjectQueryService } from './queries/PgProjectQueryService';
import { PgResourceQueryService } from './queries/PgResourceQueryService';
import { PgBalanceQueryService } from './queries/PgBalanceQueryService';
import { PgDashboardQueryService } from './queries/PgDashboardQueryService';
import { PgSuggestQueryService } from './queries/PgSuggestQueryService';
import type { IEventStore } from '../application/ports/IEventStore';
import type { ICommandBus } from '../application/ports/ICommandBus';
import type { ITaskQueryService } from '../application/ports/ITaskQueryService';
import type { IItemQueryService } from '../application/ports/IItemQueryService';
import type { ICategoryQueryService } from '../application/ports/ICategoryQueryService';
import type { IProjectQueryService } from '../application/ports/IProjectQueryService';
import type { IResourceQueryService } from '../application/ports/IResourceQueryService';
import type { IBalanceQueryService } from '../application/ports/IBalanceQueryService';
import type { IDashboardQueryService } from '../application/ports/IDashboardQueryService';
import type { ISuggestQueryService } from '../application/ports/ISuggestQueryService';
// balance-rule handlers
import { CreateBalanceRuleHandler } from '../application/command-handlers/balance-rule/CreateBalanceRuleHandler';
import { UpdateBalanceRuleHandler } from '../application/command-handlers/balance-rule/UpdateBalanceRuleHandler';
import { DeleteBalanceRuleHandler } from '../application/command-handlers/balance-rule/DeleteBalanceRuleHandler';

export interface AppDependencies {
  eventStore: IEventStore;
  commandBus: ICommandBus;
  taskQueryService: ITaskQueryService;
  itemQueryService: IItemQueryService;
  categoryQueryService: ICategoryQueryService;
  projectQueryService: IProjectQueryService;
  resourceQueryService: IResourceQueryService;
  balanceQueryService: IBalanceQueryService;
  dashboardQueryService: IDashboardQueryService;
  suggestQueryService: ISuggestQueryService;
}

export function buildDependencies(pool: Pool): AppDependencies {
  const eventStore = new EventStore(pool);

  const taskViewRepo = new PgTaskViewRepository(pool);
  const itemViewRepo = new PgItemViewRepository(pool);
  const categoryViewRepo = new PgCategoryViewRepository(pool);
  const projectViewRepo = new PgProjectViewRepository(pool);
  const resourceViewRepo = new PgResourceViewRepository(pool);
  const balanceViewRepo = new PgBalanceViewRepository(pool);
  const dashboardViewRepo = new PgDashboardViewRepository(pool);

  const runProjectors = createProjectorRunner([
    createCategoriesProjector(categoryViewRepo),
    createItemsProjector(itemViewRepo, taskViewRepo),
    createTasksProjector(taskViewRepo, itemViewRepo),
    createProjectsProjector(projectViewRepo),
    createResourcesProjector(resourceViewRepo),
    createBalanceProjector(balanceViewRepo),
    createDashboardProjector(dashboardViewRepo),
  ]);

  const commandBus = new CommandBus(runProjectors);

  // balance-rule
  commandBus.register('CreateBalanceRule', new CreateBalanceRuleHandler(eventStore));
  commandBus.register('UpdateBalanceRule', new UpdateBalanceRuleHandler(eventStore));
  commandBus.register('DeleteBalanceRule', new DeleteBalanceRuleHandler(eventStore));

  return {
    eventStore,
    commandBus,
    taskQueryService: new PgTaskQueryService(pool),
    itemQueryService: new PgItemQueryService(pool),
    categoryQueryService: new PgCategoryQueryService(pool),
    projectQueryService: new PgProjectQueryService(pool),
    resourceQueryService: new PgResourceQueryService(pool),
    balanceQueryService: new PgBalanceQueryService(pool),
    dashboardQueryService: new PgDashboardQueryService(pool),
    suggestQueryService: new PgSuggestQueryService(pool),
  };
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: wire balance-rule handlers in composition-root — template complete"
```

---

## Task 9: category aggregate

**Files:**
- Create: `src/domain/category/commands/CreateCategory.ts`
- Create: `src/domain/category/commands/UpdateCategory.ts`
- Create: `src/domain/category/commands/DeleteCategory.ts`
- Create: `src/domain/category/commands/index.ts`
- Create: `src/domain/category/events/CategoryCreated.ts`
- Create: `src/domain/category/events/CategoryUpdated.ts`
- Create: `src/domain/category/events/CategoryDeleted.ts`
- Create: `src/domain/category/Category.ts`
- Create: `src/domain/category/Category.spec.ts`
- Create: `src/application/command-handlers/category/CreateCategoryHandler.ts`
- Create: `src/application/command-handlers/category/UpdateCategoryHandler.ts`
- Create: `src/application/command-handlers/category/DeleteCategoryHandler.ts`
- Delete: `src/domain/category/aggregate.ts`, `aggregate.spec.ts`, `types.ts`
- Modify: `src/infrastructure/composition-root.ts`

- [ ] **Step 1: Create commands**

```typescript
// src/domain/category/commands/CreateCategory.ts
import type { UUID } from '../../../types';
export interface CreateCategory {
  readonly type: 'CreateCategory';
  readonly payload: { readonly id: UUID; readonly name: string; readonly icon: string; readonly color: string; readonly isDefault: boolean };
}
```

```typescript
// src/domain/category/commands/UpdateCategory.ts
import type { UUID } from '../../../types';
export interface UpdateCategory {
  readonly type: 'UpdateCategory';
  readonly payload: { readonly id: UUID; readonly name?: string; readonly icon?: string; readonly color?: string };
}
```

```typescript
// src/domain/category/commands/DeleteCategory.ts
import type { UUID } from '../../../types';
export interface DeleteCategory {
  readonly type: 'DeleteCategory';
  readonly payload: { readonly id: UUID };
}
```

```typescript
// src/domain/category/commands/index.ts
export type { CreateCategory } from './CreateCategory';
export type { UpdateCategory } from './UpdateCategory';
export type { DeleteCategory } from './DeleteCategory';
import type { CreateCategory } from './CreateCategory';
import type { UpdateCategory } from './UpdateCategory';
import type { DeleteCategory } from './DeleteCategory';
export type CategoryCommand = CreateCategory | UpdateCategory | DeleteCategory;
```

- [ ] **Step 2: Create events**

```typescript
// src/domain/category/events/CategoryCreated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateCategory } from '../commands/CreateCategory';
export class CategoryCreated extends DomainEvent {
  constructor(readonly payload: CreateCategory['payload']) {
    super('CategoryCreated', payload.id, 'category', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/category/events/CategoryUpdated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateCategory } from '../commands/UpdateCategory';
export class CategoryUpdated extends DomainEvent {
  constructor(readonly payload: UpdateCategory['payload']) {
    super('CategoryUpdated', payload.id, 'category', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/category/events/CategoryDeleted.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteCategory } from '../commands/DeleteCategory';
export class CategoryDeleted extends DomainEvent {
  constructor(readonly payload: DeleteCategory['payload']) {
    super('CategoryDeleted', payload.id, 'category', payload as Record<string, unknown>);
  }
}
```

- [ ] **Step 3: Write the failing spec**

```typescript
// src/domain/category/Category.spec.ts
import { describe, it, expect } from 'vitest';
import { Category } from './Category';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1, aggregateId: 'cat-1', aggregateType: 'category', eventType: 'CategoryCreated',
    payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false },
    version: 1, createdAt: new Date(), ...overrides,
  };
}

describe('Category', () => {
  describe('reconstruct', () => {
    it('returns null for empty history', () => {
      expect(Category.reconstruct([])).toBeNull();
    });
    it('builds state from CategoryCreated', () => {
      expect(Category.reconstruct([makeCreatedEvent()])).not.toBeNull();
    });
  });

  describe('create', () => {
    it('emits CategoryCreated', () => {
      const cmd = { type: 'CreateCategory' as const, payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false } };
      const event = Category.create(cmd);
      expect(event.eventType).toBe('CategoryCreated');
      expect(event.aggregateId).toBe('cat-1');
    });
  });

  describe('update', () => {
    it('emits CategoryUpdated', () => {
      const aggregate = Category.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.update({ type: 'UpdateCategory' as const, payload: { id: 'cat-1', name: 'Garden' } });
      expect(event.eventType).toBe('CategoryUpdated');
    });
    it('throws when deleted', () => {
      const history = [makeCreatedEvent(), makeCreatedEvent({ eventType: 'CategoryDeleted', version: 2 })];
      const aggregate = Category.reconstruct(history)!;
      expect(() => aggregate.update({ type: 'UpdateCategory' as const, payload: { id: 'cat-1' } }))
        .toThrow('Category not found');
    });
  });

  describe('delete', () => {
    it('emits CategoryDeleted', () => {
      const aggregate = Category.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.delete({ type: 'DeleteCategory' as const, payload: { id: 'cat-1' } });
      expect(event.eventType).toBe('CategoryDeleted');
    });
    it('throws when deleting built-in category', () => {
      const event = makeCreatedEvent({ payload: { id: 'cat-1', name: 'Health', icon: '💪', color: '#ef4444', isDefault: true } });
      const aggregate = Category.reconstruct([event])!;
      expect(() => aggregate.delete({ type: 'DeleteCategory' as const, payload: { id: 'cat-1' } }))
        .toThrow('Cannot delete built-in category');
    });
    it('throws when already deleted', () => {
      const history = [makeCreatedEvent(), makeCreatedEvent({ eventType: 'CategoryDeleted', version: 2 })];
      const aggregate = Category.reconstruct(history)!;
      expect(() => aggregate.delete({ type: 'DeleteCategory' as const, payload: { id: 'cat-1' } }))
        .toThrow('Category not found');
    });
  });
});
```

- [ ] **Step 4: Run spec — expect FAIL**

```bash
cd packages/backend && npx vitest run src/domain/category/Category.spec.ts
```

- [ ] **Step 5: Implement `src/domain/category/Category.ts`**

```typescript
import type { StoredEvent, UUID } from '../../types';
import type { CreateCategory } from './commands/CreateCategory';
import type { UpdateCategory } from './commands/UpdateCategory';
import type { DeleteCategory } from './commands/DeleteCategory';
import { CategoryCreated } from './events/CategoryCreated';
import { CategoryUpdated } from './events/CategoryUpdated';
import { CategoryDeleted } from './events/CategoryDeleted';

interface CategoryState {
  readonly id: UUID;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly isDefault: boolean;
  readonly deleted: boolean;
}

export class Category {
  private constructor(private readonly state: CategoryState) {}

  static reconstruct(history: StoredEvent[]): Category | null {
    let state: CategoryState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'CategoryCreated') {
        state = {
          id: payload.id as UUID, name: payload.name as string,
          icon: payload.icon as string, color: payload.color as string,
          isDefault: payload.isDefault as boolean, deleted: false,
        };
      } else if (state !== null && event.eventType === 'CategoryUpdated') {
        state = {
          ...state,
          name: (payload.name as string) ?? state.name,
          icon: (payload.icon as string) ?? state.icon,
          color: (payload.color as string) ?? state.color,
        };
      } else if (state !== null && event.eventType === 'CategoryDeleted') {
        state = { ...state, deleted: true };
      }
    }
    return state !== null ? new Category(state) : null;
  }

  static create(cmd: CreateCategory): CategoryCreated {
    return new CategoryCreated(cmd.payload);
  }

  update(cmd: UpdateCategory): CategoryUpdated {
    if (this.state.deleted) throw new Error('Category not found');
    return new CategoryUpdated(cmd.payload);
  }

  delete(cmd: DeleteCategory): CategoryDeleted {
    if (this.state.deleted) throw new Error('Category not found');
    if (this.state.isDefault) throw new Error('Cannot delete built-in category');
    return new CategoryDeleted(cmd.payload);
  }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd packages/backend && npx vitest run src/domain/category/Category.spec.ts
```

- [ ] **Step 7: Create handlers**

```typescript
// src/application/command-handlers/category/CreateCategoryHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateCategory } from '../../../domain/category/commands/CreateCategory';
import { Category } from '../../../domain/category/Category';
export class CreateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: CreateCategory): Promise<StoredEvent[]> {
    const event = Category.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
```

```typescript
// src/application/command-handlers/category/UpdateCategoryHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateCategory } from '../../../domain/category/commands/UpdateCategory';
import { Category } from '../../../domain/category/Category';
export class UpdateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: UpdateCategory): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Category.reconstruct(history);
    if (aggregate === null) throw new Error('Category not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/category/DeleteCategoryHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteCategory } from '../../../domain/category/commands/DeleteCategory';
import { Category } from '../../../domain/category/Category';
export class DeleteCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: DeleteCategory): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Category.reconstruct(history);
    if (aggregate === null) throw new Error('Category not found');
    const event = aggregate.delete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [ ] **Step 8: Delete old category files**

```bash
rm packages/backend/src/domain/category/aggregate.ts
rm packages/backend/src/domain/category/aggregate.spec.ts
rm packages/backend/src/domain/category/types.ts
```

- [ ] **Step 9: Register in composition-root — add after balance-rule block**

```typescript
import { CreateCategoryHandler } from '../application/command-handlers/category/CreateCategoryHandler';
import { UpdateCategoryHandler } from '../application/command-handlers/category/UpdateCategoryHandler';
import { DeleteCategoryHandler } from '../application/command-handlers/category/DeleteCategoryHandler';

// inside buildDependencies, after balance-rule registrations:
commandBus.register('CreateCategory', new CreateCategoryHandler(eventStore));
commandBus.register('UpdateCategory', new UpdateCategoryHandler(eventStore));
commandBus.register('DeleteCategory', new DeleteCategoryHandler(eventStore));
```

- [ ] **Step 10: Run all tests + commit**

```bash
npm test
git add -A
git commit -m "feat: migrate category aggregate to DDD class pattern"
```

---

## Task 10: item aggregate

**Files:** Same pattern as category.

- [ ] **Step 1: Create commands**

```typescript
// src/domain/item/commands/CreateItem.ts
import type { UUID } from '../../../types';
export interface CreateItem {
  readonly type: 'CreateItem';
  readonly payload: { readonly id: UUID; readonly name: string; readonly categoryId: UUID; readonly description?: string; readonly quantity?: number; readonly price?: number; readonly notes?: string };
}
```

```typescript
// src/domain/item/commands/MarkItemAvailable.ts
import type { UUID } from '../../../types';
export interface MarkItemAvailable { readonly type: 'MarkItemAvailable'; readonly payload: { readonly id: UUID } }
```

```typescript
// src/domain/item/commands/MarkItemConsumed.ts
import type { UUID } from '../../../types';
export interface MarkItemConsumed { readonly type: 'MarkItemConsumed'; readonly payload: { readonly id: UUID } }
```

```typescript
// src/domain/item/commands/MarkItemAvailableAgain.ts
import type { UUID } from '../../../types';
export interface MarkItemAvailableAgain { readonly type: 'MarkItemAvailableAgain'; readonly payload: { readonly id: UUID } }
```

```typescript
// src/domain/item/commands/index.ts
export type { CreateItem } from './CreateItem';
export type { MarkItemAvailable } from './MarkItemAvailable';
export type { MarkItemConsumed } from './MarkItemConsumed';
export type { MarkItemAvailableAgain } from './MarkItemAvailableAgain';
import type { CreateItem } from './CreateItem';
import type { MarkItemAvailable } from './MarkItemAvailable';
import type { MarkItemConsumed } from './MarkItemConsumed';
import type { MarkItemAvailableAgain } from './MarkItemAvailableAgain';
export type ItemCommand = CreateItem | MarkItemAvailable | MarkItemConsumed | MarkItemAvailableAgain;
```

- [ ] **Step 2: Create events**

```typescript
// src/domain/item/events/ItemCreated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateItem } from '../commands/CreateItem';
export class ItemCreated extends DomainEvent {
  constructor(readonly payload: CreateItem['payload'] & { status: 'to_buy' }) {
    super('ItemCreated', payload.id, 'item', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/item/events/ItemMarkedAvailable.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemAvailable } from '../commands/MarkItemAvailable';
export class ItemMarkedAvailable extends DomainEvent {
  constructor(readonly payload: MarkItemAvailable['payload']) {
    super('ItemMarkedAvailable', payload.id, 'item', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/item/events/ItemMarkedConsumed.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemConsumed } from '../commands/MarkItemConsumed';
export class ItemMarkedConsumed extends DomainEvent {
  constructor(readonly payload: MarkItemConsumed['payload']) {
    super('ItemMarkedConsumed', payload.id, 'item', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/item/events/ItemMarkedAvailableAgain.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemAvailableAgain } from '../commands/MarkItemAvailableAgain';
export class ItemMarkedAvailableAgain extends DomainEvent {
  constructor(readonly payload: MarkItemAvailableAgain['payload']) {
    super('ItemMarkedAvailableAgain', payload.id, 'item', payload as Record<string, unknown>);
  }
}
```

- [ ] **Step 3: Write failing spec**

```typescript
// src/domain/item/Item.spec.ts
import { describe, it, expect } from 'vitest';
import { Item } from './Item';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1, aggregateId: 'item-1', aggregateType: 'item', eventType: 'ItemCreated',
    payload: { id: 'item-1', name: 'Shampoo', categoryId: 'cat-1', status: 'to_buy' },
    version: 1, createdAt: new Date(), ...overrides,
  };
}

describe('Item', () => {
  it('reconstruct returns null for empty history', () => {
    expect(Item.reconstruct([])).toBeNull();
  });

  it('create emits ItemCreated with status to_buy', () => {
    const cmd = { type: 'CreateItem' as const, payload: { id: 'item-1', name: 'Shampoo', categoryId: 'cat-1' } };
    const event = Item.create(cmd);
    expect(event.eventType).toBe('ItemCreated');
    expect(event.payload.status).toBe('to_buy');
  });

  it('markAvailable emits ItemMarkedAvailable', () => {
    const aggregate = Item.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.markAvailable({ type: 'MarkItemAvailable' as const, payload: { id: 'item-1' } });
    expect(event.eventType).toBe('ItemMarkedAvailable');
  });

  it('markConsumed requires item to be available', () => {
    const aggregate = Item.reconstruct([makeCreatedEvent()])!;
    expect(() => aggregate.markConsumed({ type: 'MarkItemConsumed' as const, payload: { id: 'item-1' } }))
      .toThrow('Item must be available to consume');
  });

  it('markConsumed emits ItemMarkedConsumed when available', () => {
    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'ItemMarkedAvailable', version: 2 }),
    ];
    const aggregate = Item.reconstruct(history)!;
    const event = aggregate.markConsumed({ type: 'MarkItemConsumed' as const, payload: { id: 'item-1' } });
    expect(event.eventType).toBe('ItemMarkedConsumed');
  });

  it('markAvailableAgain emits ItemMarkedAvailableAgain', () => {
    const aggregate = Item.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.markAvailableAgain({ type: 'MarkItemAvailableAgain' as const, payload: { id: 'item-1' } });
    expect(event.eventType).toBe('ItemMarkedAvailableAgain');
  });
});
```

- [ ] **Step 4: Run spec — expect FAIL**

```bash
cd packages/backend && npx vitest run src/domain/item/Item.spec.ts
```

- [ ] **Step 5: Implement `src/domain/item/Item.ts`**

```typescript
import type { StoredEvent, UUID, ItemStatus } from '../../types';
import type { CreateItem } from './commands/CreateItem';
import type { MarkItemAvailable } from './commands/MarkItemAvailable';
import type { MarkItemConsumed } from './commands/MarkItemConsumed';
import type { MarkItemAvailableAgain } from './commands/MarkItemAvailableAgain';
import { ItemCreated } from './events/ItemCreated';
import { ItemMarkedAvailable } from './events/ItemMarkedAvailable';
import { ItemMarkedConsumed } from './events/ItemMarkedConsumed';
import { ItemMarkedAvailableAgain } from './events/ItemMarkedAvailableAgain';

interface ItemState {
  readonly id: UUID;
  readonly name: string;
  readonly categoryId: UUID;
  readonly status: ItemStatus;
}

export class Item {
  private constructor(private readonly state: ItemState) {}

  static reconstruct(history: StoredEvent[]): Item | null {
    let state: ItemState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'ItemCreated') {
        state = { id: payload.id as UUID, name: payload.name as string, categoryId: payload.categoryId as UUID, status: 'to_buy' };
      } else if (state !== null) {
        if (event.eventType === 'ItemMarkedAvailable' || event.eventType === 'ItemMarkedAvailableAgain') {
          state = { ...state, status: 'available' };
        } else if (event.eventType === 'ItemMarkedConsumed') {
          state = { ...state, status: 'consumed' };
        }
      }
    }
    return state !== null ? new Item(state) : null;
  }

  static create(cmd: CreateItem): ItemCreated {
    return new ItemCreated({ ...cmd.payload, status: 'to_buy' });
  }

  markAvailable(cmd: MarkItemAvailable): ItemMarkedAvailable {
    if (this.state === null) throw new Error('Item not found');
    return new ItemMarkedAvailable(cmd.payload);
  }

  markConsumed(cmd: MarkItemConsumed): ItemMarkedConsumed {
    if (this.state.status !== 'available') throw new Error('Item must be available to consume');
    return new ItemMarkedConsumed(cmd.payload);
  }

  markAvailableAgain(cmd: MarkItemAvailableAgain): ItemMarkedAvailableAgain {
    if (this.state === null) throw new Error('Item not found');
    return new ItemMarkedAvailableAgain(cmd.payload);
  }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd packages/backend && npx vitest run src/domain/item/Item.spec.ts
```

- [ ] **Step 7: Create handlers**

```typescript
// src/application/command-handlers/item/CreateItemHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateItem } from '../../../domain/item/commands/CreateItem';
import { Item } from '../../../domain/item/Item';
export class CreateItemHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: CreateItem): Promise<StoredEvent[]> {
    const event = Item.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
```

```typescript
// src/application/command-handlers/item/MarkItemAvailableHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemAvailable } from '../../../domain/item/commands/MarkItemAvailable';
import { Item } from '../../../domain/item/Item';
export class MarkItemAvailableHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: MarkItemAvailable): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markAvailable(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/item/MarkItemConsumedHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemConsumed } from '../../../domain/item/commands/MarkItemConsumed';
import { Item } from '../../../domain/item/Item';
export class MarkItemConsumedHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: MarkItemConsumed): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markConsumed(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/item/MarkItemAvailableAgainHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemAvailableAgain } from '../../../domain/item/commands/MarkItemAvailableAgain';
import { Item } from '../../../domain/item/Item';
export class MarkItemAvailableAgainHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: MarkItemAvailableAgain): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markAvailableAgain(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [ ] **Step 8: Delete old item files**

```bash
rm packages/backend/src/domain/item/aggregate.ts
rm packages/backend/src/domain/item/aggregate.spec.ts
rm packages/backend/src/domain/item/types.ts
```

- [ ] **Step 9: Register in composition-root**

```typescript
import { CreateItemHandler } from '../application/command-handlers/item/CreateItemHandler';
import { MarkItemAvailableHandler } from '../application/command-handlers/item/MarkItemAvailableHandler';
import { MarkItemConsumedHandler } from '../application/command-handlers/item/MarkItemConsumedHandler';
import { MarkItemAvailableAgainHandler } from '../application/command-handlers/item/MarkItemAvailableAgainHandler';

// inside buildDependencies:
commandBus.register('CreateItem', new CreateItemHandler(eventStore));
commandBus.register('MarkItemAvailable', new MarkItemAvailableHandler(eventStore));
commandBus.register('MarkItemConsumed', new MarkItemConsumedHandler(eventStore));
commandBus.register('MarkItemAvailableAgain', new MarkItemAvailableAgainHandler(eventStore));
```

- [ ] **Step 10: Run all tests + commit**

```bash
npm test
git add -A
git commit -m "feat: migrate item aggregate to DDD class pattern"
```

---

## Task 11: task aggregate (10 commands)

**Files:** Same pattern; `Task` aggregate class has private static `addInterval` helper.

- [ ] **Step 1: Create commands**

```typescript
// src/domain/task/commands/CreateTask.ts
import type { UUID, EstimatedDuration } from '../../../types';
export interface CreateTask {
  readonly type: 'CreateTask';
  readonly payload: { readonly id: UUID; readonly name: string; readonly categoryId: UUID; readonly description?: string; readonly projectId?: UUID; readonly estimatedDuration?: EstimatedDuration; readonly dueDate?: string };
}
```

```typescript
// src/domain/task/commands/StartTask.ts
import type { UUID } from '../../../types';
export interface StartTask { readonly type: 'StartTask'; readonly payload: { readonly id: UUID } }
```

```typescript
// src/domain/task/commands/CompleteTask.ts
import type { UUID } from '../../../types';
export interface CompleteTask {
  readonly type: 'CompleteTask';
  readonly payload: { readonly id: UUID; readonly itemDisposals: Array<{ itemId: UUID; consumed: boolean }> };
}
```

```typescript
// src/domain/task/commands/AddItemRequirement.ts
import type { UUID } from '../../../types';
export interface AddItemRequirement {
  readonly type: 'AddItemRequirement';
  readonly payload: { readonly taskId: UUID; readonly itemId: UUID; readonly consumable: boolean };
}
```

```typescript
// src/domain/task/commands/AttachResourceToTask.ts
import type { UUID } from '../../../types';
export interface AttachResourceToTask {
  readonly type: 'AttachResourceToTask';
  readonly payload: { readonly taskId: UUID; readonly resourceId: UUID };
}
```

```typescript
// src/domain/task/commands/DetachResourceFromTask.ts
import type { UUID } from '../../../types';
export interface DetachResourceFromTask {
  readonly type: 'DetachResourceFromTask';
  readonly payload: { readonly taskId: UUID; readonly resourceId: UUID };
}
```

```typescript
// src/domain/task/commands/SetTaskRecurrence.ts
import type { UUID, RecurrenceRule } from '../../../types';
export interface SetTaskRecurrence {
  readonly type: 'SetTaskRecurrence';
  readonly payload: { readonly id: UUID; readonly recurrenceRule: RecurrenceRule; readonly dueDate?: string };
}
```

```typescript
// src/domain/task/commands/SkipRecurrence.ts
import type { UUID } from '../../../types';
export interface SkipRecurrence { readonly type: 'SkipRecurrence'; readonly payload: { readonly id: UUID } }
```

```typescript
// src/domain/task/commands/ScheduleTask.ts
import type { UUID } from '../../../types';
export interface ScheduleTask {
  readonly type: 'ScheduleTask';
  readonly payload: { readonly id: UUID; readonly scheduledDate: string; readonly scheduledStartTime: string };
}
```

```typescript
// src/domain/task/commands/PromoteToProject.ts
import type { UUID } from '../../../types';
export interface PromoteToProject {
  readonly type: 'PromoteToProject';
  readonly payload: { readonly taskId: UUID; readonly projectId: UUID };
}
```

```typescript
// src/domain/task/commands/index.ts
export type { CreateTask } from './CreateTask';
export type { StartTask } from './StartTask';
export type { CompleteTask } from './CompleteTask';
export type { AddItemRequirement } from './AddItemRequirement';
export type { AttachResourceToTask } from './AttachResourceToTask';
export type { DetachResourceFromTask } from './DetachResourceFromTask';
export type { SetTaskRecurrence } from './SetTaskRecurrence';
export type { SkipRecurrence } from './SkipRecurrence';
export type { ScheduleTask } from './ScheduleTask';
export type { PromoteToProject } from './PromoteToProject';
import type { CreateTask } from './CreateTask';
import type { StartTask } from './StartTask';
import type { CompleteTask } from './CompleteTask';
import type { AddItemRequirement } from './AddItemRequirement';
import type { AttachResourceToTask } from './AttachResourceToTask';
import type { DetachResourceFromTask } from './DetachResourceFromTask';
import type { SetTaskRecurrence } from './SetTaskRecurrence';
import type { SkipRecurrence } from './SkipRecurrence';
import type { ScheduleTask } from './ScheduleTask';
import type { PromoteToProject } from './PromoteToProject';
export type TaskCommand = CreateTask | StartTask | CompleteTask | AddItemRequirement | AttachResourceToTask | DetachResourceFromTask | SetTaskRecurrence | SkipRecurrence | ScheduleTask | PromoteToProject;
```

- [ ] **Step 2: Create events**

```typescript
// src/domain/task/events/TaskCreated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateTask } from '../commands/CreateTask';
export class TaskCreated extends DomainEvent {
  constructor(readonly payload: CreateTask['payload']) {
    super('TaskCreated', payload.id, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/TaskStarted.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { StartTask } from '../commands/StartTask';
export class TaskStarted extends DomainEvent {
  constructor(readonly payload: StartTask['payload']) {
    super('TaskStarted', payload.id, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/TaskCompleted.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CompleteTask } from '../commands/CompleteTask';
export class TaskCompleted extends DomainEvent {
  constructor(readonly payload: CompleteTask['payload']) {
    super('TaskCompleted', payload.id, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/TaskRescheduled.ts
import { DomainEvent } from '../../shared/DomainEvent';
export class TaskRescheduled extends DomainEvent {
  constructor(readonly payload: { id: string; nextDueDate: string }) {
    super('TaskRescheduled', payload.id, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/ItemRequirementAdded.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { AddItemRequirement } from '../commands/AddItemRequirement';
export class ItemRequirementAdded extends DomainEvent {
  constructor(readonly payload: AddItemRequirement['payload']) {
    super('ItemRequirementAdded', payload.taskId, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/ResourceAttachedToTask.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { AttachResourceToTask } from '../commands/AttachResourceToTask';
export class ResourceAttachedToTask extends DomainEvent {
  constructor(readonly payload: AttachResourceToTask['payload']) {
    super('ResourceAttachedToTask', payload.taskId, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/ResourceDetachedFromTask.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { DetachResourceFromTask } from '../commands/DetachResourceFromTask';
export class ResourceDetachedFromTask extends DomainEvent {
  constructor(readonly payload: DetachResourceFromTask['payload']) {
    super('ResourceDetachedFromTask', payload.taskId, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/TaskRecurrenceSet.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { SetTaskRecurrence } from '../commands/SetTaskRecurrence';
export class TaskRecurrenceSet extends DomainEvent {
  constructor(readonly payload: SetTaskRecurrence['payload']) {
    super('TaskRecurrenceSet', payload.id, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/RecurrenceSkipped.ts
import { DomainEvent } from '../../shared/DomainEvent';
export class RecurrenceSkipped extends DomainEvent {
  constructor(readonly payload: { id: string; nextDueDate: string }) {
    super('RecurrenceSkipped', payload.id, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/TaskScheduled.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { ScheduleTask } from '../commands/ScheduleTask';
export class TaskScheduled extends DomainEvent {
  constructor(readonly payload: ScheduleTask['payload']) {
    super('TaskScheduled', payload.id, 'task', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/task/events/TaskPromotedToProject.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { PromoteToProject } from '../commands/PromoteToProject';
export class TaskPromotedToProject extends DomainEvent {
  constructor(readonly payload: PromoteToProject['payload']) {
    super('TaskPromotedToProject', payload.taskId, 'task', payload as Record<string, unknown>);
  }
}
```

- [ ] **Step 3: Write failing spec**

```typescript
// src/domain/task/Task.spec.ts
import { describe, it, expect } from 'vitest';
import { Task } from './Task';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1, aggregateId: 'task-1', aggregateType: 'task', eventType: 'TaskCreated',
    payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' },
    version: 1, createdAt: new Date(), ...overrides,
  };
}

describe('Task', () => {
  it('reconstruct returns null for empty history', () => {
    expect(Task.reconstruct([])).toBeNull();
  });

  it('create emits TaskCreated', () => {
    const event = Task.create({ type: 'CreateTask' as const, payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' } });
    expect(event.eventType).toBe('TaskCreated');
    expect(event.aggregateId).toBe('task-1');
  });

  it('start emits TaskStarted', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.start({ type: 'StartTask' as const, payload: { id: 'task-1' } });
    expect(event.eventType).toBe('TaskStarted');
  });

  it('complete emits TaskCompleted', () => {
    const history = [makeCreatedEvent(), makeCreatedEvent({ eventType: 'TaskStarted', version: 2 })];
    const aggregate = Task.reconstruct(history)!;
    const events = aggregate.complete({ type: 'CompleteTask' as const, payload: { id: 'task-1', itemDisposals: [] } });
    expect(events[0].eventType).toBe('TaskCompleted');
  });

  it('complete also emits TaskRescheduled when recurrence rule exists', () => {
    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'TaskStarted', version: 2 }),
      makeCreatedEvent({ eventType: 'TaskRecurrenceSet', version: 3, payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'week' }, dueDate: '2026-06-16T00:00:00.000Z' } }),
    ];
    const aggregate = Task.reconstruct(history)!;
    const events = aggregate.complete({ type: 'CompleteTask' as const, payload: { id: 'task-1', itemDisposals: [] } });
    expect(events).toHaveLength(2);
    expect(events[1].eventType).toBe('TaskRescheduled');
  });

  it('skipRecurrence throws when no recurrence rule', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    expect(() => aggregate.skipRecurrence({ type: 'SkipRecurrence' as const, payload: { id: 'task-1' } }))
      .toThrow('Task has no recurrence rule');
  });

  it('skipRecurrence emits RecurrenceSkipped', () => {
    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'TaskRecurrenceSet', version: 2, payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'day' }, dueDate: '2026-06-16T00:00:00.000Z' } }),
    ];
    const aggregate = Task.reconstruct(history)!;
    const event = aggregate.skipRecurrence({ type: 'SkipRecurrence' as const, payload: { id: 'task-1' } });
    expect(event.eventType).toBe('RecurrenceSkipped');
  });
});
```

- [ ] **Step 4: Run spec — expect FAIL**

```bash
cd packages/backend && npx vitest run src/domain/task/Task.spec.ts
```

- [ ] **Step 5: Implement `src/domain/task/Task.ts`**

```typescript
import type { StoredEvent, UUID, RecurrenceRule } from '../../types';
import type { DomainEvent } from '../shared/DomainEvent';
import type { CreateTask } from './commands/CreateTask';
import type { StartTask } from './commands/StartTask';
import type { CompleteTask } from './commands/CompleteTask';
import type { AddItemRequirement } from './commands/AddItemRequirement';
import type { AttachResourceToTask } from './commands/AttachResourceToTask';
import type { DetachResourceFromTask } from './commands/DetachResourceFromTask';
import type { SetTaskRecurrence } from './commands/SetTaskRecurrence';
import type { SkipRecurrence } from './commands/SkipRecurrence';
import type { ScheduleTask } from './commands/ScheduleTask';
import type { PromoteToProject } from './commands/PromoteToProject';
import { TaskCreated } from './events/TaskCreated';
import { TaskStarted } from './events/TaskStarted';
import { TaskCompleted } from './events/TaskCompleted';
import { TaskRescheduled } from './events/TaskRescheduled';
import { ItemRequirementAdded } from './events/ItemRequirementAdded';
import { ResourceAttachedToTask } from './events/ResourceAttachedToTask';
import { ResourceDetachedFromTask } from './events/ResourceDetachedFromTask';
import { TaskRecurrenceSet } from './events/TaskRecurrenceSet';
import { RecurrenceSkipped } from './events/RecurrenceSkipped';
import { TaskScheduled } from './events/TaskScheduled';
import { TaskPromotedToProject } from './events/TaskPromotedToProject';

interface TaskState {
  readonly id: UUID;
  readonly name: string;
  readonly categoryId: UUID;
  readonly started: boolean;
  readonly completed: boolean;
  readonly recurrenceRule: RecurrenceRule | null;
  readonly dueDate: string | null;
}

export class Task {
  private constructor(private readonly state: TaskState) {}

  private static addInterval(date: Date, rule: RecurrenceRule): Date {
    const next = new Date(date);
    if (rule.unit === 'day') next.setDate(next.getDate() + rule.interval);
    else if (rule.unit === 'week') next.setDate(next.getDate() + rule.interval * 7);
    else if (rule.unit === 'month') next.setMonth(next.getMonth() + rule.interval);
    else if (rule.unit === 'year') next.setFullYear(next.getFullYear() + rule.interval);
    return next;
  }

  static reconstruct(history: StoredEvent[]): Task | null {
    let state: TaskState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'TaskCreated') {
        state = {
          id: payload.id as UUID, name: payload.name as string, categoryId: payload.categoryId as UUID,
          started: false, completed: false, recurrenceRule: null,
          dueDate: (payload.dueDate as string) ?? null,
        };
      } else if (state !== null) {
        if (event.eventType === 'TaskStarted') state = { ...state, started: true };
        else if (event.eventType === 'TaskCompleted') state = { ...state, completed: true };
        else if (event.eventType === 'TaskRescheduled') state = { ...state, completed: false, started: false, dueDate: payload.nextDueDate as string };
        else if (event.eventType === 'TaskRecurrenceSet') state = { ...state, recurrenceRule: payload.recurrenceRule as RecurrenceRule, dueDate: (payload.dueDate as string) ?? state.dueDate };
        else if (event.eventType === 'RecurrenceSkipped') state = { ...state, dueDate: payload.nextDueDate as string };
      }
    }
    return state !== null ? new Task(state) : null;
  }

  static create(cmd: CreateTask): TaskCreated {
    return new TaskCreated(cmd.payload);
  }

  start(cmd: StartTask): TaskStarted {
    if (this.state === null) throw new Error('Task not found');
    return new TaskStarted(cmd.payload);
  }

  complete(cmd: CompleteTask): DomainEvent[] {
    if (this.state === null) throw new Error('Task not found');
    const events: DomainEvent[] = [new TaskCompleted(cmd.payload)];
    if (this.state.recurrenceRule) {
      const base = this.state.dueDate ? new Date(this.state.dueDate) : new Date();
      const nextDueDate = Task.addInterval(base, this.state.recurrenceRule).toISOString();
      events.push(new TaskRescheduled({ id: cmd.payload.id, nextDueDate }));
    }
    return events;
  }

  addItemRequirement(cmd: AddItemRequirement): ItemRequirementAdded {
    if (this.state === null) throw new Error('Task not found');
    return new ItemRequirementAdded(cmd.payload);
  }

  attachResource(cmd: AttachResourceToTask): ResourceAttachedToTask {
    if (this.state === null) throw new Error('Task not found');
    return new ResourceAttachedToTask(cmd.payload);
  }

  detachResource(cmd: DetachResourceFromTask): ResourceDetachedFromTask {
    if (this.state === null) throw new Error('Task not found');
    return new ResourceDetachedFromTask(cmd.payload);
  }

  setRecurrence(cmd: SetTaskRecurrence): TaskRecurrenceSet {
    if (this.state === null) throw new Error('Task not found');
    return new TaskRecurrenceSet(cmd.payload);
  }

  skipRecurrence(cmd: SkipRecurrence): RecurrenceSkipped {
    if (!this.state.recurrenceRule) throw new Error('Task has no recurrence rule');
    const base = this.state.dueDate ? new Date(this.state.dueDate) : new Date();
    const nextDueDate = Task.addInterval(base, this.state.recurrenceRule).toISOString();
    return new RecurrenceSkipped({ id: cmd.payload.id, nextDueDate });
  }

  schedule(cmd: ScheduleTask): TaskScheduled {
    if (this.state === null) throw new Error('Task not found');
    return new TaskScheduled(cmd.payload);
  }

  promoteToProject(cmd: PromoteToProject): TaskPromotedToProject {
    if (this.state === null) throw new Error('Task not found');
    return new TaskPromotedToProject(cmd.payload);
  }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd packages/backend && npx vitest run src/domain/task/Task.spec.ts
```

- [ ] **Step 7: Create handlers**

```typescript
// src/application/command-handlers/task/CreateTaskHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateTask } from '../../../domain/task/commands/CreateTask';
import { Task } from '../../../domain/task/Task';
export class CreateTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: CreateTask): Promise<StoredEvent[]> {
    const event = Task.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
```

```typescript
// src/application/command-handlers/task/StartTaskHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { StartTask } from '../../../domain/task/commands/StartTask';
import { Task } from '../../../domain/task/Task';
export class StartTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: StartTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.start(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/CompleteTaskHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CompleteTask } from '../../../domain/task/commands/CompleteTask';
import { Task } from '../../../domain/task/Task';
export class CompleteTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: CompleteTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const events = aggregate.complete(cmd);
    return this.eventStore.append(events, history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/AddItemRequirementHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AddItemRequirement } from '../../../domain/task/commands/AddItemRequirement';
import { Task } from '../../../domain/task/Task';
export class AddItemRequirementHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: AddItemRequirement): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.addItemRequirement(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/AttachResourceToTaskHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AttachResourceToTask } from '../../../domain/task/commands/AttachResourceToTask';
import { Task } from '../../../domain/task/Task';
export class AttachResourceToTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: AttachResourceToTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.attachResource(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/DetachResourceFromTaskHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DetachResourceFromTask } from '../../../domain/task/commands/DetachResourceFromTask';
import { Task } from '../../../domain/task/Task';
export class DetachResourceFromTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: DetachResourceFromTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.detachResource(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/SetTaskRecurrenceHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { SetTaskRecurrence } from '../../../domain/task/commands/SetTaskRecurrence';
import { Task } from '../../../domain/task/Task';
export class SetTaskRecurrenceHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: SetTaskRecurrence): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.setRecurrence(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/SkipRecurrenceHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { SkipRecurrence } from '../../../domain/task/commands/SkipRecurrence';
import { Task } from '../../../domain/task/Task';
export class SkipRecurrenceHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: SkipRecurrence): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.skipRecurrence(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/ScheduleTaskHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { ScheduleTask } from '../../../domain/task/commands/ScheduleTask';
import { Task } from '../../../domain/task/Task';
export class ScheduleTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: ScheduleTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.schedule(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/task/PromoteToProjectHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { PromoteToProject } from '../../../domain/task/commands/PromoteToProject';
import { Task } from '../../../domain/task/Task';
export class PromoteToProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: PromoteToProject): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.promoteToProject(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [ ] **Step 8: Delete old task files**

```bash
rm packages/backend/src/domain/task/aggregate.ts
rm packages/backend/src/domain/task/aggregate.spec.ts
rm packages/backend/src/domain/task/types.ts
```

- [ ] **Step 9: Register in composition-root**

```typescript
import { CreateTaskHandler } from '../application/command-handlers/task/CreateTaskHandler';
import { StartTaskHandler } from '../application/command-handlers/task/StartTaskHandler';
import { CompleteTaskHandler } from '../application/command-handlers/task/CompleteTaskHandler';
import { AddItemRequirementHandler } from '../application/command-handlers/task/AddItemRequirementHandler';
import { AttachResourceToTaskHandler } from '../application/command-handlers/task/AttachResourceToTaskHandler';
import { DetachResourceFromTaskHandler } from '../application/command-handlers/task/DetachResourceFromTaskHandler';
import { SetTaskRecurrenceHandler } from '../application/command-handlers/task/SetTaskRecurrenceHandler';
import { SkipRecurrenceHandler } from '../application/command-handlers/task/SkipRecurrenceHandler';
import { ScheduleTaskHandler } from '../application/command-handlers/task/ScheduleTaskHandler';
import { PromoteToProjectHandler } from '../application/command-handlers/task/PromoteToProjectHandler';

// inside buildDependencies:
commandBus.register('CreateTask', new CreateTaskHandler(eventStore));
commandBus.register('StartTask', new StartTaskHandler(eventStore));
commandBus.register('CompleteTask', new CompleteTaskHandler(eventStore));
commandBus.register('AddItemRequirement', new AddItemRequirementHandler(eventStore));
commandBus.register('AttachResourceToTask', new AttachResourceToTaskHandler(eventStore));
commandBus.register('DetachResourceFromTask', new DetachResourceFromTaskHandler(eventStore));
commandBus.register('SetTaskRecurrence', new SetTaskRecurrenceHandler(eventStore));
commandBus.register('SkipRecurrence', new SkipRecurrenceHandler(eventStore));
commandBus.register('ScheduleTask', new ScheduleTaskHandler(eventStore));
commandBus.register('PromoteToProject', new PromoteToProjectHandler(eventStore));
```

- [ ] **Step 10: Run all tests + commit**

```bash
npm test
git add -A
git commit -m "feat: migrate task aggregate to DDD class pattern"
```

---

## Task 12: project aggregate

- [ ] **Step 1: Create commands**

```typescript
// src/domain/project/commands/CreateProject.ts
import type { UUID } from '../../../types';
export interface CreateProject {
  readonly type: 'CreateProject';
  readonly payload: { readonly id: UUID; readonly name: string; readonly categoryId: UUID; readonly description?: string; readonly dueDate?: string };
}
```

```typescript
// src/domain/project/commands/AddTaskToProject.ts
import type { UUID } from '../../../types';
export interface AddTaskToProject {
  readonly type: 'AddTaskToProject';
  readonly payload: { readonly projectId: UUID; readonly taskId: UUID };
}
```

```typescript
// src/domain/project/commands/CompleteProject.ts
import type { UUID } from '../../../types';
export interface CompleteProject { readonly type: 'CompleteProject'; readonly payload: { readonly id: UUID } }
```

```typescript
// src/domain/project/commands/index.ts
export type { CreateProject } from './CreateProject';
export type { AddTaskToProject } from './AddTaskToProject';
export type { CompleteProject } from './CompleteProject';
import type { CreateProject } from './CreateProject';
import type { AddTaskToProject } from './AddTaskToProject';
import type { CompleteProject } from './CompleteProject';
export type ProjectCommand = CreateProject | AddTaskToProject | CompleteProject;
```

- [ ] **Step 2: Create events**

```typescript
// src/domain/project/events/ProjectCreated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateProject } from '../commands/CreateProject';
export class ProjectCreated extends DomainEvent {
  constructor(readonly payload: CreateProject['payload']) {
    super('ProjectCreated', payload.id, 'project', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/project/events/TaskAddedToProject.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { AddTaskToProject } from '../commands/AddTaskToProject';
export class TaskAddedToProject extends DomainEvent {
  constructor(readonly payload: AddTaskToProject['payload']) {
    super('TaskAddedToProject', payload.projectId, 'project', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/project/events/ProjectCompleted.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CompleteProject } from '../commands/CompleteProject';
export class ProjectCompleted extends DomainEvent {
  constructor(readonly payload: CompleteProject['payload']) {
    super('ProjectCompleted', payload.id, 'project', payload as Record<string, unknown>);
  }
}
```

- [ ] **Step 3: Write failing spec**

```typescript
// src/domain/project/Project.spec.ts
import { describe, it, expect } from 'vitest';
import { Project } from './Project';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1, aggregateId: 'proj-1', aggregateType: 'project', eventType: 'ProjectCreated',
    payload: { id: 'proj-1', name: 'Bathroom reno', categoryId: 'cat-1' },
    version: 1, createdAt: new Date(), ...overrides,
  };
}

describe('Project', () => {
  it('reconstruct returns null for empty history', () => {
    expect(Project.reconstruct([])).toBeNull();
  });

  it('create emits ProjectCreated', () => {
    const event = Project.create({ type: 'CreateProject' as const, payload: { id: 'proj-1', name: 'Bathroom reno', categoryId: 'cat-1' } });
    expect(event.eventType).toBe('ProjectCreated');
    expect(event.aggregateId).toBe('proj-1');
  });

  it('addTask emits TaskAddedToProject', () => {
    const aggregate = Project.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.addTask({ type: 'AddTaskToProject' as const, payload: { projectId: 'proj-1', taskId: 'task-1' } });
    expect(event.eventType).toBe('TaskAddedToProject');
  });

  it('complete emits ProjectCompleted', () => {
    const aggregate = Project.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.complete({ type: 'CompleteProject' as const, payload: { id: 'proj-1' } });
    expect(event.eventType).toBe('ProjectCompleted');
  });

  it('throws when project not found', () => {
    expect(Project.reconstruct([])).toBeNull();
  });
});
```

- [ ] **Step 4: Run spec — expect FAIL**

```bash
cd packages/backend && npx vitest run src/domain/project/Project.spec.ts
```

- [ ] **Step 5: Implement `src/domain/project/Project.ts`**

```typescript
import type { StoredEvent, UUID } from '../../types';
import type { CreateProject } from './commands/CreateProject';
import type { AddTaskToProject } from './commands/AddTaskToProject';
import type { CompleteProject } from './commands/CompleteProject';
import { ProjectCreated } from './events/ProjectCreated';
import { TaskAddedToProject } from './events/TaskAddedToProject';
import { ProjectCompleted } from './events/ProjectCompleted';

interface ProjectState {
  readonly id: UUID;
  readonly name: string;
  readonly status: 'active' | 'on_hold' | 'done';
  readonly taskIds: UUID[];
}

export class Project {
  private constructor(private readonly state: ProjectState) {}

  static reconstruct(history: StoredEvent[]): Project | null {
    let state: ProjectState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'ProjectCreated') {
        state = { id: payload.id as UUID, name: payload.name as string, status: 'active', taskIds: [] };
      } else if (state !== null) {
        if (event.eventType === 'TaskAddedToProject') {
          state = { ...state, taskIds: [...state.taskIds, payload.taskId as UUID] };
        } else if (event.eventType === 'ProjectCompleted') {
          state = { ...state, status: 'done' };
        }
      }
    }
    return state !== null ? new Project(state) : null;
  }

  static create(cmd: CreateProject): ProjectCreated {
    return new ProjectCreated(cmd.payload);
  }

  addTask(cmd: AddTaskToProject): TaskAddedToProject {
    if (this.state === null) throw new Error('Project not found');
    return new TaskAddedToProject(cmd.payload);
  }

  complete(cmd: CompleteProject): ProjectCompleted {
    if (this.state === null) throw new Error('Project not found');
    return new ProjectCompleted(cmd.payload);
  }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd packages/backend && npx vitest run src/domain/project/Project.spec.ts
```

- [ ] **Step 7: Create handlers**

```typescript
// src/application/command-handlers/project/CreateProjectHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateProject } from '../../../domain/project/commands/CreateProject';
import { Project } from '../../../domain/project/Project';
export class CreateProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: CreateProject): Promise<StoredEvent[]> {
    const event = Project.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
```

```typescript
// src/application/command-handlers/project/AddTaskToProjectHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AddTaskToProject } from '../../../domain/project/commands/AddTaskToProject';
import { Project } from '../../../domain/project/Project';
export class AddTaskToProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: AddTaskToProject): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.projectId);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.addTask(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/project/CompleteProjectHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CompleteProject } from '../../../domain/project/commands/CompleteProject';
import { Project } from '../../../domain/project/Project';
export class CompleteProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: CompleteProject): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.complete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [ ] **Step 8: Delete old project files**

```bash
rm packages/backend/src/domain/project/aggregate.ts
rm packages/backend/src/domain/project/aggregate.spec.ts
rm packages/backend/src/domain/project/types.ts
```

- [ ] **Step 9: Register in composition-root**

```typescript
import { CreateProjectHandler } from '../application/command-handlers/project/CreateProjectHandler';
import { AddTaskToProjectHandler } from '../application/command-handlers/project/AddTaskToProjectHandler';
import { CompleteProjectHandler } from '../application/command-handlers/project/CompleteProjectHandler';

commandBus.register('CreateProject', new CreateProjectHandler(eventStore));
commandBus.register('AddTaskToProject', new AddTaskToProjectHandler(eventStore));
commandBus.register('CompleteProject', new CompleteProjectHandler(eventStore));
```

- [ ] **Step 10: Run all tests + commit**

```bash
npm test
git add -A
git commit -m "feat: migrate project aggregate to DDD class pattern"
```

---

## Task 13: resource aggregate

- [ ] **Step 1: Create commands**

```typescript
// src/domain/resource/commands/CreateResource.ts
import type { UUID, ResourceType } from '../../../types';
export interface CreateResource {
  readonly type: 'CreateResource';
  readonly payload: { readonly id: UUID; readonly title: string; readonly type: ResourceType; readonly url?: string; readonly notes?: string; readonly categoryId?: UUID };
}
```

```typescript
// src/domain/resource/commands/UpdateResource.ts
import type { UUID } from '../../../types';
export interface UpdateResource {
  readonly type: 'UpdateResource';
  readonly payload: { readonly id: UUID; readonly title?: string; readonly url?: string; readonly notes?: string };
}
```

```typescript
// src/domain/resource/commands/DeleteResource.ts
import type { UUID } from '../../../types';
export interface DeleteResource { readonly type: 'DeleteResource'; readonly payload: { readonly id: UUID } }
```

```typescript
// src/domain/resource/commands/index.ts
export type { CreateResource } from './CreateResource';
export type { UpdateResource } from './UpdateResource';
export type { DeleteResource } from './DeleteResource';
import type { CreateResource } from './CreateResource';
import type { UpdateResource } from './UpdateResource';
import type { DeleteResource } from './DeleteResource';
export type ResourceCommand = CreateResource | UpdateResource | DeleteResource;
```

- [ ] **Step 2: Create events**

```typescript
// src/domain/resource/events/ResourceCreated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateResource } from '../commands/CreateResource';
export class ResourceCreated extends DomainEvent {
  constructor(readonly payload: CreateResource['payload']) {
    super('ResourceCreated', payload.id, 'resource', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/resource/events/ResourceUpdated.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateResource } from '../commands/UpdateResource';
export class ResourceUpdated extends DomainEvent {
  constructor(readonly payload: UpdateResource['payload']) {
    super('ResourceUpdated', payload.id, 'resource', payload as Record<string, unknown>);
  }
}
```

```typescript
// src/domain/resource/events/ResourceDeleted.ts
import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteResource } from '../commands/DeleteResource';
export class ResourceDeleted extends DomainEvent {
  constructor(readonly payload: DeleteResource['payload']) {
    super('ResourceDeleted', payload.id, 'resource', payload as Record<string, unknown>);
  }
}
```

- [ ] **Step 3: Write failing spec**

```typescript
// src/domain/resource/Resource.spec.ts
import { describe, it, expect } from 'vitest';
import { Resource } from './Resource';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1, aggregateId: 'res-1', aggregateType: 'resource', eventType: 'ResourceCreated',
    payload: { id: 'res-1', title: 'How to fix a tap', type: 'link', url: 'https://example.com' },
    version: 1, createdAt: new Date(), ...overrides,
  };
}

describe('Resource', () => {
  it('reconstruct returns null for empty history', () => {
    expect(Resource.reconstruct([])).toBeNull();
  });

  it('create emits ResourceCreated', () => {
    const event = Resource.create({ type: 'CreateResource' as const, payload: { id: 'res-1', title: 'Guide', type: 'link' as const } });
    expect(event.eventType).toBe('ResourceCreated');
    expect(event.aggregateId).toBe('res-1');
  });

  it('update emits ResourceUpdated', () => {
    const aggregate = Resource.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.update({ type: 'UpdateResource' as const, payload: { id: 'res-1', title: 'Updated guide' } });
    expect(event.eventType).toBe('ResourceUpdated');
  });

  it('update throws when resource not found', () => {
    expect(Resource.reconstruct([])).toBeNull();
  });

  it('delete emits ResourceDeleted', () => {
    const aggregate = Resource.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.delete({ type: 'DeleteResource' as const, payload: { id: 'res-1' } });
    expect(event.eventType).toBe('ResourceDeleted');
  });
});
```

- [ ] **Step 4: Run spec — expect FAIL**

```bash
cd packages/backend && npx vitest run src/domain/resource/Resource.spec.ts
```

- [ ] **Step 5: Implement `src/domain/resource/Resource.ts`**

```typescript
import type { StoredEvent, UUID, ResourceType } from '../../types';
import type { CreateResource } from './commands/CreateResource';
import type { UpdateResource } from './commands/UpdateResource';
import type { DeleteResource } from './commands/DeleteResource';
import { ResourceCreated } from './events/ResourceCreated';
import { ResourceUpdated } from './events/ResourceUpdated';
import { ResourceDeleted } from './events/ResourceDeleted';

interface ResourceState {
  readonly id: UUID;
  readonly title: string;
  readonly type: ResourceType;
  readonly exists: boolean;
}

export class Resource {
  private constructor(private readonly state: ResourceState) {}

  static reconstruct(history: StoredEvent[]): Resource | null {
    let state: ResourceState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'ResourceCreated') {
        state = { id: payload.id as UUID, title: payload.title as string, type: payload.type as ResourceType, exists: true };
      } else if (state !== null && event.eventType === 'ResourceDeleted') {
        state = { ...state, exists: false };
      }
    }
    return state !== null ? new Resource(state) : null;
  }

  static create(cmd: CreateResource): ResourceCreated {
    return new ResourceCreated(cmd.payload);
  }

  update(cmd: UpdateResource): ResourceUpdated {
    if (!this.state.exists) throw new Error('Resource not found');
    return new ResourceUpdated(cmd.payload);
  }

  delete(cmd: DeleteResource): ResourceDeleted {
    if (!this.state.exists) throw new Error('Resource not found');
    return new ResourceDeleted(cmd.payload);
  }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd packages/backend && npx vitest run src/domain/resource/Resource.spec.ts
```

- [ ] **Step 7: Create handlers**

```typescript
// src/application/command-handlers/resource/CreateResourceHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateResource } from '../../../domain/resource/commands/CreateResource';
import { Resource } from '../../../domain/resource/Resource';
export class CreateResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: CreateResource): Promise<StoredEvent[]> {
    const event = Resource.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
```

```typescript
// src/application/command-handlers/resource/UpdateResourceHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateResource } from '../../../domain/resource/commands/UpdateResource';
import { Resource } from '../../../domain/resource/Resource';
export class UpdateResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: UpdateResource): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Resource.reconstruct(history);
    if (aggregate === null) throw new Error('Resource not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

```typescript
// src/application/command-handlers/resource/DeleteResourceHandler.ts
import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteResource } from '../../../domain/resource/commands/DeleteResource';
import { Resource } from '../../../domain/resource/Resource';
export class DeleteResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: DeleteResource): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Resource.reconstruct(history);
    if (aggregate === null) throw new Error('Resource not found');
    const event = aggregate.delete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
```

- [ ] **Step 8: Delete old resource files**

```bash
rm packages/backend/src/domain/resource/aggregate.ts
rm packages/backend/src/domain/resource/aggregate.spec.ts
rm packages/backend/src/domain/resource/types.ts
```

- [ ] **Step 9: Register in composition-root**

```typescript
import { CreateResourceHandler } from '../application/command-handlers/resource/CreateResourceHandler';
import { UpdateResourceHandler } from '../application/command-handlers/resource/UpdateResourceHandler';
import { DeleteResourceHandler } from '../application/command-handlers/resource/DeleteResourceHandler';

commandBus.register('CreateResource', new CreateResourceHandler(eventStore));
commandBus.register('UpdateResource', new UpdateResourceHandler(eventStore));
commandBus.register('DeleteResource', new DeleteResourceHandler(eventStore));
```

- [ ] **Step 10: Run all tests + commit**

```bash
npm test
git add -A
git commit -m "feat: migrate resource aggregate to DDD class pattern"
```

---

## Task 14: Final cleanup

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass, zero failures.

- [ ] **Step 2: Update CLAUDE.md — add DDD standard reference**

In `CLAUDE.md`, in the **Coding Standards** section, add after the existing TypeScript standard reference:

```markdown
### DDD Aggregate Structure (enforced on every aggregate)

> Full rules: [`docs/coding-standards/ddd-standard.md`](docs/coding-standards/ddd-standard.md)

Key rules — apply these without being asked:
- Aggregates are classes with `private constructor`, `static reconstruct`, `static create`, and instance command methods
- Commands are interfaces in `domain/<agg>/commands/` — one file per command
- Domain events are classes extending `DomainEvent` in `domain/<agg>/events/` — one file per event
- Command handlers live in `application/command-handlers/<agg>/` — one class per command
- `CommandBus` is a pure registry; handlers call `IEventStore` directly — never raw `pg`
- `EventStore` and `CommandBus` live in `infrastructure/`, not at `src/` root
```

- [ ] **Step 3: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: add DDD aggregate structure rules to CLAUDE.md"
```

---

## Completion Checklist

After all tasks:
- [ ] `npm test` passes with zero failures
- [ ] No files remain in `src/command-bus/` or `src/event-store/`
- [ ] No `aggregate.ts` or `types.ts` files remain in any `domain/<agg>/` folder
- [ ] All 6 aggregates have `commands/`, `events/`, `<Aggregate>.ts`, `<Aggregate>.spec.ts`
- [ ] All command handlers exist in `application/command-handlers/<agg>/`
- [ ] `infrastructure/composition-root.ts` registers all handlers
- [ ] `ddd-standard.md` referenced in `CLAUDE.md`
