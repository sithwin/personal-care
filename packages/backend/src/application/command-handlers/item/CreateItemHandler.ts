import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateItemCommand } from '../../../domain/item/commands/CreateItemCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Item } from '../../../domain/item/Item';

export class CreateItemHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateItemCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createItem.handle', payload: { id: cmd.payload.id } });
    const event = Item.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createItem.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
