import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateItem } from '../../../domain/item/commands/CreateItem';
import { Item } from '../../../domain/item/Item';

export class CreateItemHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateItem): Promise<StoredEvent[]> {
    const event = Item.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
