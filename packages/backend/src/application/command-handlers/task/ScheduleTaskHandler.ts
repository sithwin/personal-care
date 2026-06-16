import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { ScheduleTaskCommand } from '../../../domain/task/commands/ScheduleTaskCommand';
import { Task } from '../../../domain/task/Task';

export class ScheduleTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: ScheduleTaskCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.schedule(cmd);
    return this.eventStore.append([event], history.length);
  }
}
