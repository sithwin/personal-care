import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { AddTaskToProjectCommand } from '../../../domain/project/commands/AddTaskToProjectCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Project } from '../../../domain/project/Project';

export class AddTaskToProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: AddTaskToProjectCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'addTaskToProject.handle', payload: { id: cmd.payload.projectId } });
    const history = await this.eventStore.getEvents(cmd.payload.projectId);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.addTask(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'addTaskToProject.persisted', payload: { id: cmd.payload.projectId } });
    return stored;
  }
}
