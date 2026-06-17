import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { ResumeProjectCommand } from '../../../domain/project/commands/ResumeProjectCommand';
import { Project } from '../../../domain/project/Project';

export class ResumeProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}
  async handle(cmd: ResumeProjectCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.resume(cmd);
    return this.eventStore.append([event], history.length);
  }
}
