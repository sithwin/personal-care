import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CompleteProjectCommand } from '../../../domain/project/commands/CompleteProjectCommand';
import { Project } from '../../../domain/project/Project';

export class CompleteProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CompleteProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.complete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
