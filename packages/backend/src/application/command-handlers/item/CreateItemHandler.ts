import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateItemCommand } from '../../../domain/item/commands/CreateItemCommand';
import { Item } from '../../../domain/item/Item';

export class CreateItemHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateItemCommand): Promise<StoredEvent[]> {
    const event = Item.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
