import type { StoredEvent, UUID, ItemStatus } from '../../types';
import type { CreateItemCommand } from './commands/CreateItemCommand';
import type { MarkItemAvailableCommand } from './commands/MarkItemAvailableCommand';
import type { MarkItemConsumedCommand } from './commands/MarkItemConsumedCommand';
import type { MarkItemAvailableAgainCommand } from './commands/MarkItemAvailableAgainCommand';
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
          state = { ...(state as ItemState), status: 'available' };
        } else if (event.eventType === 'ItemMarkedConsumed') {
          state = { ...(state as ItemState), status: 'consumed' };
        }
      }
    }
    return state !== null ? new Item(state) : null;
  }

  static create(cmd: CreateItemCommand): ItemCreated {
    return new ItemCreated({ ...cmd.payload, status: 'to_buy' });
  }

  markAvailable(cmd: MarkItemAvailableCommand): ItemMarkedAvailable {
    return new ItemMarkedAvailable(cmd.payload);
  }

  markConsumed(cmd: MarkItemConsumedCommand): ItemMarkedConsumed {
    if (this.state.status !== 'available') throw new Error('Item must be available to consume');
    return new ItemMarkedConsumed(cmd.payload);
  }

  markAvailableAgain(cmd: MarkItemAvailableAgainCommand): ItemMarkedAvailableAgain {
    return new ItemMarkedAvailableAgain(cmd.payload);
  }
}
