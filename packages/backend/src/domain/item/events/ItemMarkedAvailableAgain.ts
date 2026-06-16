import { DomainEvent } from '../../shared/DomainEvent';
import type { MarkItemAvailableAgainCommand } from '../commands/MarkItemAvailableAgainCommand';

export class ItemMarkedAvailableAgain extends DomainEvent {
  constructor(readonly payload: MarkItemAvailableAgainCommand['payload']) {
    super('ItemMarkedAvailableAgain', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
