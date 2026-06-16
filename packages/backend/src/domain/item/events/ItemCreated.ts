import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateItemCommand } from '../commands/CreateItemCommand';

export class ItemCreated extends DomainEvent {
  constructor(readonly payload: CreateItemCommand['payload'] & { status: 'to_buy' }) {
    super('ItemCreated', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
