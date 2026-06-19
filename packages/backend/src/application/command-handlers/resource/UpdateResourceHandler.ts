import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateResourceCommand } from '../../../domain/resource/commands/UpdateResourceCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Resource } from '../../../domain/resource/Resource';

export class UpdateResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateResourceCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'updateResource.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Resource.reconstruct(history);
    if (aggregate === null) throw new Error('Resource not found');
    const event = aggregate.update(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'updateResource.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
