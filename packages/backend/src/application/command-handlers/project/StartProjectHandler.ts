import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { StartProjectCommand } from '../../../domain/project/commands/StartProjectCommand';
import { Project } from '../../../domain/project/Project';

export class StartProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: StartProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.start(cmd);
    return this.eventStore.append([event], history.length);
  }
}
