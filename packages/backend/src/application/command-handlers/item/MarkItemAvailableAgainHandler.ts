import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { MarkItemAvailableAgainCommand } from '../../../domain/item/commands/MarkItemAvailableAgainCommand';
import { Item } from '../../../domain/item/Item';

export class MarkItemAvailableAgainHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: MarkItemAvailableAgainCommand): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Item.reconstruct(history);
    if (aggregate === null) throw new Error('Item not found');
    const event = aggregate.markAvailableAgain(cmd);
    return this.eventStore.append([event], history.length);
  }
}
