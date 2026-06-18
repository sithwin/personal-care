import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { RemoveItemRequirementCommand } from '../../../domain/task/commands/RemoveItemRequirementCommand';
import { Task } from '../../../domain/task/Task';

export class RemoveItemRequirementHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: RemoveItemRequirementCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.removeItemRequirement(cmd);
    return this.eventStore.append([event], history.length);
  }
}
