import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateTaskCommand } from '../../../domain/task/commands/UpdateTaskCommand';
import { Task } from '../../../domain/task/Task';

export class UpdateTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateTaskCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
