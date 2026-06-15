import { IEventStore } from '../application/ports/IEventStore';
import { ICommandBus } from '../application/ports/ICommandBus';
import { childLogger } from '../infrastructure/logger';

const log = childLogger('CommandBus');
import { DomainEvent, StoredEvent } from '../types';
import { handleCategoryCommand } from '../domain/category/aggregate';
import { handleItemCommand } from '../domain/item/aggregate';
import { handleTaskCommand } from '../domain/task/aggregate';
import { handleProjectCommand } from '../domain/project/aggregate';
import { handleResourceCommand } from '../domain/resource/aggregate';
import { handleBalanceRuleCommand } from '../domain/balance-rule/aggregate';
import type { CategoryCommand } from '../domain/category/types';
import type { ItemCommand } from '../domain/item/types';
import type { TaskCommand } from '../domain/task/types';
import type { ProjectCommand } from '../domain/project/types';
import type { ResourceCommand } from '../domain/resource/types';
import type { BalanceRuleCommand } from '../domain/balance-rule/types';

type AnyCommand =
  | CategoryCommand
  | ItemCommand
  | TaskCommand
  | ProjectCommand
  | ResourceCommand
  | BalanceRuleCommand;

type CommandHandler<TCmd extends AnyCommand> = (
  command: TCmd,
  history: StoredEvent[],
) => DomainEvent[];

interface CommandRegistration {
  handler: (command: AnyCommand, history: StoredEvent[]) => DomainEvent[];
  getAggregateId: (command: AnyCommand) => string;
}

/**
 * Routes commands to their aggregate handler via a registry.
 * Adding a new aggregate requires only a new register() call — no edits here. (OCP)
 * Depends on IEventStore (not pg.Pool) so the application layer stays infra-free. (DIP)
 * Post-persist side effects (projections, emails, etc.) are handled by the injected
 * onEventsStored callback — decoupling CommandBus from all knowledge of projectors. (SRP)
 */
export class CommandBus implements ICommandBus {
  private readonly registry = new Map<string, CommandRegistration>();

  constructor(
    private readonly eventStore: IEventStore,
    private readonly onEventsStored?: (events: StoredEvent[]) => Promise<void>,
  ) {
    this.registerAggregate(handleCategoryCommand, {
      CreateCategory:  (c) => (c.payload as { id: string }).id,
      UpdateCategory:  (c) => (c.payload as { id: string }).id,
      DeleteCategory:  (c) => (c.payload as { id: string }).id,
    });

    this.registerAggregate(handleItemCommand, {
      CreateItem:          (c) => (c.payload as { id: string }).id,
      MarkItemAvailable:   (c) => (c.payload as { id: string }).id,
      MarkItemConsumed:    (c) => (c.payload as { id: string }).id,
      MarkItemAvailableAgain: (c) => (c.payload as { id: string }).id,
    });

    this.registerAggregate(handleTaskCommand, {
      CreateTask:            (c) => (c.payload as { id: string }).id,
      StartTask:             (c) => (c.payload as { id: string }).id,
      CompleteTask:          (c) => (c.payload as { id: string }).id,
      SetTaskRecurrence:     (c) => (c.payload as { id: string }).id,
      SkipRecurrence:        (c) => (c.payload as { id: string }).id,
      ScheduleTask:          (c) => (c.payload as { id: string }).id,
      AddItemRequirement:    (c) => (c.payload as { taskId: string }).taskId,
      AttachResourceToTask:  (c) => (c.payload as { taskId: string }).taskId,
      DetachResourceFromTask:(c) => (c.payload as { taskId: string }).taskId,
      PromoteToProject:      (c) => (c.payload as { taskId: string }).taskId,
    });

    this.registerAggregate(handleProjectCommand, {
      CreateProject:    (c) => (c.payload as { id: string }).id,
      CompleteProject:  (c) => (c.payload as { id: string }).id,
      AddTaskToProject: (c) => (c.payload as { projectId: string }).projectId,
    });

    this.registerAggregate(handleResourceCommand, {
      CreateResource: (c) => (c.payload as { id: string }).id,
      UpdateResource: (c) => (c.payload as { id: string }).id,
      DeleteResource: (c) => (c.payload as { id: string }).id,
    });

    this.registerAggregate(handleBalanceRuleCommand, {
      CreateBalanceRule: (c) => (c.payload as { id: string }).id,
      UpdateBalanceRule: (c) => (c.payload as { id: string }).id,
      DeleteBalanceRule: (c) => (c.payload as { id: string }).id,
    });
  }

  /**
   * Register a set of command types that share the same aggregate handler.
   * Each entry maps a command type string to its aggregate-ID extractor.
   */
  private registerAggregate<TCmd extends AnyCommand>(
    handler: (command: TCmd, history: StoredEvent[]) => DomainEvent[],
    idExtractors: Record<string, (command: AnyCommand) => string>,
  ): void {
    for (const [commandType, getAggregateId] of Object.entries(idExtractors)) {
      this.registry.set(commandType, {
        handler: handler as CommandRegistration['handler'],
        getAggregateId,
      });
    }
  }

  async dispatch(command: { type: string; payload: Record<string, unknown> }): Promise<StoredEvent[]> {
    const registration = this.registry.get(command.type);
    if (!registration) {
      log.warn({ commandType: command.type }, 'No handler registered for command');
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    const anyCommand = command as unknown as AnyCommand;
    const aggregateId = registration.getAggregateId(anyCommand);
    log.debug({ commandType: command.type, aggregateId }, 'Dispatching command');

    const history = await this.eventStore.getEvents(aggregateId);
    const expectedVersion = history.length > 0 ? history[history.length - 1].version : 0;

    const newEvents = registration.handler(anyCommand, history);
    const stored = await this.eventStore.append(newEvents, expectedVersion);

    log.info(
      { commandType: command.type, aggregateId, eventCount: stored.length, events: stored.map(e => e.eventType) },
      'Command dispatched',
    );

    await this.onEventsStored?.(stored);

    return stored;
  }
}
