import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemConsumedCommand } from '../commands/MarkItemConsumedCommand';

export class ItemMarkedConsumed extends DomainEvent {
  constructor(readonly payload: MarkItemConsumedCommand['payload']) {
    super('ItemMarkedConsumed', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
