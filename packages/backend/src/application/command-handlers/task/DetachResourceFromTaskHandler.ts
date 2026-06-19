import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DetachResourceFromTaskCommand } from '../../../domain/task/commands/DetachResourceFromTaskCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Task } from '../../../domain/task/Task';

export class DetachResourceFromTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DetachResourceFromTaskCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'detachResourceFromTask.handle', payload: { id: cmd.payload.taskId } });
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.detachResource(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'detachResourceFromTask.persisted', payload: { id: cmd.payload.taskId } });
    return stored;
  }
}
