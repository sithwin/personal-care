import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemAvailableCommand } from '../commands/MarkItemAvailableCommand';

export class ItemMarkedAvailable extends DomainEvent {
  constructor(readonly payload: MarkItemAvailableCommand['payload']) {
    super('ItemMarkedAvailable', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
