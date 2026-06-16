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
