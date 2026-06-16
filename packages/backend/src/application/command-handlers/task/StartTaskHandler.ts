import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { StartTask } from '../../../domain/task/commands/StartTask';
import { Task } from '../../../domain/task/Task';

export class StartTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: StartTask): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.start(cmd);
    return this.eventStore.append([event], history.length);
  }
}
