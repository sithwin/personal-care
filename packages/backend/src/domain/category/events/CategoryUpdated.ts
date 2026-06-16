import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateCategory } from '../commands/UpdateCategory';

export class CategoryUpdated extends DomainEvent {
  constructor(readonly payload: UpdateCategory['payload']) {
    super('CategoryUpdated', payload.id, 'category', payload as unknown as Record<string, unknown>);
  }
}
