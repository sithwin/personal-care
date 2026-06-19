import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { RemoveItemRequirementCommand } from '../../../domain/task/commands/RemoveItemRequirementCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Task } from '../../../domain/task/Task';

export class RemoveItemRequirementHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: RemoveItemRequirementCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'removeItemRequirement.handle', payload: { id: cmd.payload.taskId } });
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.removeItemRequirement(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'removeItemRequirement.persisted', payload: { id: cmd.payload.taskId } });
    return stored;
  }
}
