import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateTask } from '../../../domain/task/commands/CreateTask';
import { Task } from '../../../domain/task/Task';

export class CreateTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateTask): Promise<StoredEvent[]> {
    const event = Task.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
