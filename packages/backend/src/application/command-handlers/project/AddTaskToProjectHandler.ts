import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AddTaskToProject } from '../../../domain/project/commands/AddTaskToProject';
import { Project } from '../../../domain/project/Project';

export class AddTaskToProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: AddTaskToProject): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.projectId);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.addTask(cmd);
    return this.eventStore.append([event], history.length);
  }
}
