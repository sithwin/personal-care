import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { SkipRecurrence } from '../../../domain/task/commands/SkipRecurrence';
import { Task } from '../../../domain/task/Task';

export class SkipRecurrenceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: SkipRecurrence): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.skipRecurrence(cmd);
    return this.eventStore.append([event], history.length);
  }
}
