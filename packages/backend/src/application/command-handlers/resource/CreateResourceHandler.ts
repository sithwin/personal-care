import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateResourceCommand } from '../../../domain/resource/commands/CreateResourceCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Resource } from '../../../domain/resource/Resource';

export class CreateResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateResourceCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createResource.handle' });
    const event = Resource.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createResource.persisted', payload: { id: stored[0].aggregateId } });
    return stored;
  }
}
