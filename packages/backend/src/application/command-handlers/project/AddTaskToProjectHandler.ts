import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AddTaskToProjectCommand } from '../../../domain/project/commands/AddTaskToProjectCommand';
import { Project } from '../../../domain/project/Project';

export class AddTaskToProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: AddTaskToProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.projectId);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.addTask(cmd);
    return this.eventStore.append([event], history.length);
  }
}
