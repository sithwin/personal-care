import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteResourceCommand } from '../../../domain/resource/commands/DeleteResourceCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Resource } from '../../../domain/resource/Resource';

export class DeleteResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DeleteResourceCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'deleteResource.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Resource.reconstruct(history);
    if (aggregate === null) throw new Error('Resource not found');
    const event = aggregate.delete(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'deleteResource.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
