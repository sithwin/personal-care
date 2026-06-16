import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemAvailable } from '../commands/MarkItemAvailable';

export class ItemMarkedAvailable extends DomainEvent {
  constructor(readonly payload: MarkItemAvailable['payload']) {
    super('ItemMarkedAvailable', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
