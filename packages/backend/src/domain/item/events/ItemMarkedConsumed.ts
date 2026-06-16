import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemConsumed } from '../commands/MarkItemConsumed';

export class ItemMarkedConsumed extends DomainEvent {
  constructor(readonly payload: MarkItemConsumed['payload']) {
    super('ItemMarkedConsumed', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
