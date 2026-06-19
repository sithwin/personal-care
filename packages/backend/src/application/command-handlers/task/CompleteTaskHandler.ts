import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CompleteTaskCommand } from '../../../domain/task/commands/CompleteTaskCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Task } from '../../../domain/task/Task';

export class CompleteTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CompleteTaskCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'completeTask.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const events = aggregate.complete(cmd);
    const stored = await this.eventStore.append(events, history.length, ctx);
    ctx.log.info({ logEvent: 'completeTask.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
