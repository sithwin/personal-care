import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CompleteTask } from '../../../domain/task/commands/CompleteTask';
import { Task } from '../../../domain/task/Task';

export class CompleteTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CompleteTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const events = aggregate.complete(cmd);
    return this.eventStore.append(events, history.length);
  }
}
