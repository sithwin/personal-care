import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemConsumedCommand } from '../../../domain/item/commands/MarkItemConsumedCommand';
import { Item } from '../../../domain/item/Item';

export class MarkItemConsumedHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: MarkItemConsumedCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markConsumed(cmd);
    return this.eventStore.append([event], history.length);
  }
}
