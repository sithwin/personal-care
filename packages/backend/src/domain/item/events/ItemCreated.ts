import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateItem } from '../commands/CreateItem';

export class ItemCreated extends DomainEvent {
  constructor(readonly payload: CreateItem['payload'] & { status: 'to_buy' }) {
    super('ItemCreated', payload.id, 'item', payload as unknown as Record<string, unknown>);
  }
}
