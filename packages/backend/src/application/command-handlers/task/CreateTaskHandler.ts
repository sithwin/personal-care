import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateTaskCommand } from '../../../domain/task/commands/CreateTaskCommand';
import { Task } from '../../../domain/task/Task';

export class CreateTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateTaskCommand): Promise<StoredEvent[]> {
    const event = Task.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
