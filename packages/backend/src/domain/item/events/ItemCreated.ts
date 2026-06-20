import { DomainEvent } from '../../shared/DomainEvent';
import type { UUID } from '../../../types';
import type { CreateItemCommand } from '../commands/CreateItemCommand';

export class ItemCreated extends DomainEvent {
  constructor(aggregateId: UUID, payload: CreateItemCommand['payload'] & { status: 'to_buy' }) {
    super('ItemCreated', aggregateId, 'item', payload as unknown as Record<string, unknown>);
  }
}
