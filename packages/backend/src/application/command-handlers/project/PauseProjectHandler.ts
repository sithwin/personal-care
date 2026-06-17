import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { PauseProjectCommand } from '../../../domain/project/commands/PauseProjectCommand';
import { Project } from '../../../domain/project/Project';

export class PauseProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: PauseProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.pause(cmd);
    return this.eventStore.append([event], history.length);
  }
}
