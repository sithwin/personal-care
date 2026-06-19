import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CompleteProjectCommand } from '../../../domain/project/commands/CompleteProjectCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Project } from '../../../domain/project/Project';

export class CompleteProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CompleteProjectCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'completeProject.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.complete(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'completeProject.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
