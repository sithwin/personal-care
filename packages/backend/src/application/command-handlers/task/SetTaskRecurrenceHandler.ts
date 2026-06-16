import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { SetTaskRecurrence } from '../../../domain/task/commands/SetTaskRecurrence';
import { Task } from '../../../domain/task/Task';

export class SetTaskRecurrenceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: SetTaskRecurrence): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.setRecurrence(cmd);
    return this.eventStore.append([event], history.length);
  }
}
