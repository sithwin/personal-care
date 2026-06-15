import { Pool } from 'pg';
import { EventStore } from '../event-store/event-store';
import { CommandBus } from '../command-bus/command-bus';
import { runProjectors } from '../projections/runner';
import type { IEventStore } from '../application/ports/IEventStore';
import type { ICommandBus } from '../application/ports/ICommandBus';

/**
 * Composition Root — the single place where concrete implementations are wired to interfaces.
 * Only this file (and Express route handlers) may import from infrastructure directly.
 * Everything else depends on IEventStore / ICommandBus, not on pg or EventStore.
 */
export interface AppDependencies {
  eventStore: IEventStore;
  commandBus: ICommandBus;
}

export function buildDependencies(pool: Pool): AppDependencies {
  const eventStore = new EventStore(pool);

  const commandBus = new CommandBus(
    eventStore,
    async (events) => runProjectors(events, pool), // projector subscriber wired here only
  );

  return { eventStore, commandBus };
}
