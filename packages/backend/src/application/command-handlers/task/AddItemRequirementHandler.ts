import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AddItemRequirementCommand } from '../../../domain/task/commands/AddItemRequirementCommand';
import { Task } from '../../../domain/task/Task';

export class AddItemRequirementHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: AddItemRequirementCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.addItemRequirement(cmd);
    return this.eventStore.append([event], history.length);
  }
}
