import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { PromoteToProject } from '../../../domain/task/commands/PromoteToProject';
import { Task } from '../../../domain/task/Task';

export class PromoteToProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: PromoteToProject): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.taskId);
    const aggregate = Task.reconstruct(history);
    if (aggregate === null) throw new Error('Task not found');
    const event = aggregate.promoteToProject(cmd);
    return this.eventStore.append([event], history.length);
  }
}
