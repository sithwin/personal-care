import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AttachResourceToTaskCommand } from '../../../domain/task/commands/AttachResourceToTaskCommand';
import { Task } from '../../../domain/task/Task';

export class AttachResourceToTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: AttachResourceToTaskCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.attachResource(cmd);
    return this.eventStore.append([event], history.length);
  }
}
