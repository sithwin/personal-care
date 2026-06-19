import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemAvailableAgainCommand } from '../../../domain/item/commands/MarkItemAvailableAgainCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Item } from '../../../domain/item/Item';

export class MarkItemAvailableAgainHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: MarkItemAvailableAgainCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'markItemAvailableAgain.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markAvailableAgain(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'markItemAvailableAgain.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
