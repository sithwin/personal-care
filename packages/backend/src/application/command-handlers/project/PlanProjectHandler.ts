import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { PlanProjectCommand } from '../../../domain/project/commands/PlanProjectCommand';
import { Project } from '../../../domain/project/Project';

export class PlanProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: PlanProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.plan(cmd);
    return this.eventStore.append([event], history.length);
  }
}
