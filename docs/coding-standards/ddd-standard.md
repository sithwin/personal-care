# DDD + Clean Architecture Standards

Based on [Khalil Stemmler's DDD with TypeScript](https://khalilstemmler.com/articles/typescript-domain-driven-design/chain-business-logic-domain-events/) and [typescript-event-sourcing](https://github.com/xolvio/typescript-event-sourcing).  
Applies to all domain aggregates in this project.

---

## 1. Folder Layout Per Aggregate

Every aggregate follows this exact structure. No exceptions.

```
src/
  domain/
    shared/
      DomainEvent.ts                  ← abstract base class; one file, shared by all aggregates
    <aggregate-name>/
      commands/
        CreateFoo.ts                  ← one interface per command
        UpdateFoo.ts
        DeleteFoo.ts
        index.ts                      ← union type FooCommand = CreateFoo | UpdateFoo | ...
      events/
        FooCreated.ts                 ← one class per event, extends DomainEvent
        FooUpdated.ts
        FooDeleted.ts
      Foo.ts                          ← Aggregate class (UpperCamelCase, matches aggregate name)

  application/
    command-handlers/
      <aggregate-name>/
        CreateFooHandler.ts           ← one class per command
        UpdateFooHandler.ts
        DeleteFooHandler.ts

  infrastructure/
    command-bus/
      CommandBus.ts                   ← routes commands to handlers; registers all handlers
    persistence/
      EventStore.ts                   ← PostgreSQL IEventStore implementation
    composition-root.ts               ← instantiates handlers, registers with CommandBus
```

**Rules:**
- `domain/` has zero infrastructure dependencies — no `pg`, no `express`, no logger
- `application/` depends only on `domain/` interfaces and `IEventStore` port
- `infrastructure/` owns all I/O: `pg`, logger, `CommandBus`, `EventStore`
- Never put business logic in `infrastructure/` or `application/`

---

## 2. Base Domain Event

One shared abstract class. All concrete event classes extend it.

```
src/domain/shared/DomainEvent.ts
```

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

**Rules:**
- Never instantiate `DomainEvent` directly — it is abstract
- `eventType` is past tense: `BalanceRuleCreated`, not `CreateBalanceRule`
- `aggregateType` is the snake_case name of the aggregate: `'balance_rule'`, `'task'`
- `payload` carries all data needed to reconstruct state from this event

---

## 3. Commands

One interface per command, grouped under `commands/`. Barrel-exported via `index.ts`.

```
src/domain/<aggregate>/commands/CreateBalanceRule.ts
```

```typescript
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

```
src/domain/<aggregate>/commands/index.ts
```

```typescript
export type { CreateBalanceRule } from './CreateBalanceRule';
export type { UpdateBalanceRule } from './UpdateBalanceRule';
export type { DeleteBalanceRule } from './DeleteBalanceRule';

import type { CreateBalanceRule } from './CreateBalanceRule';
import type { UpdateBalanceRule } from './UpdateBalanceRule';
import type { DeleteBalanceRule } from './DeleteBalanceRule';

export type BalanceRuleCommand = CreateBalanceRule | UpdateBalanceRule | DeleteBalanceRule;
```

**Rules:**
- Commands are interfaces (not classes) — they carry no behaviour
- Command names are imperative: `CreateBalanceRule`, not `BalanceRuleCreated`
- `type` is a string literal matching the class name exactly
- All fields are `readonly`

---

## 4. Domain Events

One class per event, extending `DomainEvent`. Payload type is inlined or imported from the matching command.

```
src/domain/<aggregate>/events/BalanceRuleCreated.ts
```

```typescript
import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateBalanceRule } from '../commands/CreateBalanceRule';

export class BalanceRuleCreated extends DomainEvent {
  constructor(readonly payload: CreateBalanceRule['payload']) {
    super('BalanceRuleCreated', payload.id, 'balance_rule', payload as unknown as Record<string, unknown>);
  }
}
```

**Rules:**
- Event names are past tense: `BalanceRuleCreated`, not `CreateBalanceRule`
- One event class per file — file name matches class name exactly
- `payload` is strongly typed via the matching command's payload type
- `aggregateType` matches the snake_case string used everywhere for this aggregate

---

## 5. Aggregate Class

The aggregate is a class with a private constructor, a static `reconstruct` factory, and one method per command that mutates state.

```
src/domain/<aggregate>/BalanceRule.ts
```

```typescript
import type { StoredEvent } from '../../types';
import type { CreateBalanceRule } from './commands/CreateBalanceRule';
import type { UpdateBalanceRule } from './commands/UpdateBalanceRule';
import type { DeleteBalanceRule } from './commands/DeleteBalanceRule';
import { BalanceRuleCreated } from './events/BalanceRuleCreated';
import { BalanceRuleUpdated } from './events/BalanceRuleUpdated';
import { BalanceRuleDeleted } from './events/BalanceRuleDeleted';
import type { UUID, BalanceFrequency, DayRestriction } from '../../types';

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

  // Replays the event history to reconstruct aggregate state.
  // Returns null if the aggregate has never been created.
  static reconstruct(history: StoredEvent[]): BalanceRule | null {
    let state: BalanceRuleState | null = null;
    for (const event of history) {
      const payload = event.payload as Record<string, unknown>;
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

  // Static: no existing state needed — the aggregate is being created for the first time.
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

**Rules:**
- Constructor is always `private` — only `reconstruct` and `static create` may instantiate
- `reconstruct` returns `null` when no `*Created` event exists in history
- `create` is `static` — it does not need existing state
- All other command methods are instance methods — they enforce invariants against `this.state`
- Invariant violations throw `Error` with a descriptive message
- No infrastructure imports — zero `pg`, `express`, or logger references

---

## 6. Command Handlers

One class per command, in `application/command-handlers/<aggregate>/`. Each handler loads the aggregate from the event store, invokes the right method, and persists the result.

```
src/application/command-handlers/balance-rule/CreateBalanceRuleHandler.ts
```

```typescript
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

```
src/application/command-handlers/balance-rule/UpdateBalanceRuleHandler.ts
```

```typescript
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

**Rules:**
- Each handler depends only on `IEventStore` — never on `pg.Pool` directly
- `create` commands pass `0` as `expectedVersion` (aggregate does not exist yet)
- Update/delete commands pass `history.length` as `expectedVersion` for optimistic concurrency
- Handlers never call projectors — that is the `CommandBus`'s responsibility
- Handlers return `StoredEvent[]` — the caller (`CommandBus`) triggers side effects

---

## 7. CommandBus Wiring (Infrastructure)

`CommandBus` lives in `infrastructure/command-bus/CommandBus.ts`. It registers handlers by command type and calls `onEventsStored` after persist (projections, notifications, etc.).

```typescript
// infrastructure/composition-root.ts
const createBalanceRuleHandler = new CreateBalanceRuleHandler(eventStore);
const updateBalanceRuleHandler = new UpdateBalanceRuleHandler(eventStore);
const deleteBalanceRuleHandler = new DeleteBalanceRuleHandler(eventStore);

commandBus.register('CreateBalanceRule', createBalanceRuleHandler);
commandBus.register('UpdateBalanceRule', updateBalanceRuleHandler);
commandBus.register('DeleteBalanceRule', deleteBalanceRuleHandler);
```

**Rules:**
- `CommandBus` is the only place that knows about all command types
- Registration is explicit — no magic reflection or auto-discovery
- `onEventsStored` callback is injected into `CommandBus`, not into individual handlers

---

## 8. What Does NOT Belong in Each Layer

| Layer | Never put here |
|-------|----------------|
| `domain/` | `pg`, `express`, logger, HTTP status codes, `IEventStore` calls |
| `application/` | SQL queries, `pg.Pool`, logger, projection logic |
| `infrastructure/` | Business invariants, domain rules, aggregate reconstruction |
| `api/routes/` | Business logic, SQL, direct aggregate access |
