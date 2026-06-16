import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { ScheduleTask } from '../../../domain/task/commands/ScheduleTask';
import { Task } from '../../../domain/task/Task';

export class ScheduleTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: ScheduleTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.schedule(cmd);
    return this.eventStore.append([event], history.length);
  }
}
