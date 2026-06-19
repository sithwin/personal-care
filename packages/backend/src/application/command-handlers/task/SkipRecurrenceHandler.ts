import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { SkipRecurrenceCommand } from '../../../domain/task/commands/SkipRecurrenceCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Task } from '../../../domain/task/Task';

export class SkipRecurrenceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: SkipRecurrenceCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'skipRecurrence.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.skipRecurrence(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'skipRecurrence.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
