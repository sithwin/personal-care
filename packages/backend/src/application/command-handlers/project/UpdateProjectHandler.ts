import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateProjectCommand } from '../../../domain/project/commands/UpdateProjectCommand';
import { Project } from '../../../domain/project/Project';

export class UpdateProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: UpdateProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
