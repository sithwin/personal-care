import type { StoredEvent, UUID, ItemStatus } from '../../types';
import type { CreateItem } from './commands/CreateItem';
import type { MarkItemAvailable } from './commands/MarkItemAvailable';
import type { MarkItemConsumed } from './commands/MarkItemConsumed';
import type { MarkItemAvailableAgain } from './commands/MarkItemAvailableAgain';
import { ItemCreated } from './events/ItemCreated';
import { ItemMarkedAvailable } from './events/ItemMarkedAvailable';
import { ItemMarkedConsumed } from './events/ItemMarkedConsumed';
import { ItemMarkedAvailableAgain } from './events/ItemMarkedAvailableAgain';

interface ItemState {
  readonly id: UUID;
  readonly name: string;
  readonly categoryId: UUID;
  readonly status: ItemStatus;
}

export class Item {
  private constructor(private readonly state: ItemState) {}

  static reconstruct(history: StoredEvent[]): Item | null {
    let state: ItemState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'ItemCreated') {
        state = {
          id: payload.id as UUID,
          name: payload.name as string,
          categoryId: payload.categoryId as UUID,
          status: 'to_buy',
        };
      } else if (state !== null) {
        if (event.eventType === 'ItemMarkedAvailable' || event.eventType === 'ItemMarkedAvailableAgain') {
          state = { ...state, status: 'available' };
        } else if (event.eventType === 'ItemMarkedConsumed') {
          state = { ...state, status: 'consumed' };
        }
      }
    }
    return state !== null ? new Item(state) : null;
  }

  static create(cmd: CreateItem): ItemCreated {
    return new ItemCreated({ ...cmd.payload, status: 'to_buy' });
  }

  markAvailable(cmd: MarkItemAvailable): ItemMarkedAvailable {
    return new ItemMarkedAvailable(cmd.payload);
  }

  markConsumed(cmd: MarkItemConsumed): ItemMarkedConsumed {
    if (this.state.status !== 'available') throw new Error('Item must be available to consume');
    return new ItemMarkedConsumed(cmd.payload);
  }

  markAvailableAgain(cmd: MarkItemAvailableAgain): ItemMarkedAvailableAgain {
    return new ItemMarkedAvailableAgain(cmd.payload);
  }
}
