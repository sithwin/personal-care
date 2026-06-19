import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemAvailableCommand } from '../../../domain/item/commands/MarkItemAvailableCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Item } from '../../../domain/item/Item';

export class MarkItemAvailableHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: MarkItemAvailableCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'markItemAvailable.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markAvailable(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'markItemAvailable.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
