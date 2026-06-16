import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemAvailableAgain } from '../commands/MarkItemAvailableAgain';

export class ItemMarkedAvailableAgain extends DomainEvent {
  constructor(readonly payload: MarkItemAvailableAgain['payload']) {
    super('ItemMarkedAvailableAgain', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
