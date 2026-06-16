import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteCategory } from '../commands/DeleteCategory';

export class CategoryDeleted extends DomainEvent {
  constructor(readonly payload: DeleteCategory['payload']) {
    super('CategoryDeleted', payload.id, 'category', payload as unknown as Record<string, unknown>);
  }
}
