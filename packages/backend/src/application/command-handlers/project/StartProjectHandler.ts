import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { StartProjectCommand } from '../../../domain/project/commands/StartProjectCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Project } from '../../../domain/project/Project';

export class StartProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: StartProjectCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'startProject.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Project.reconstruct(history);
    if (aggregate === null) throw new Error('Project not found');
    const event = aggregate.start(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'startProject.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
