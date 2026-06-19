import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateProjectCommand } from '../../../domain/project/commands/CreateProjectCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Project } from '../../../domain/project/Project';

export class CreateProjectHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateProjectCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createProject.handle', payload: { id: cmd.payload.id } });
    const event = Project.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createProject.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
