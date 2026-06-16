import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemAvailable } from '../../../domain/item/commands/MarkItemAvailable';
import { Item } from '../../../domain/item/Item';

export class MarkItemAvailableHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: MarkItemAvailable): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markAvailable(cmd);
    return this.eventStore.append([event], history.length);
  }
}
