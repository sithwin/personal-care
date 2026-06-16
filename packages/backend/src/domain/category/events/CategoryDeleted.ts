import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteCategoryCommand } from '../commands/DeleteCategoryCommand';

export class CategoryDeleted extends DomainEvent {
  constructor(readonly payload: DeleteCategoryCommand['payload']) {
    super('CategoryDeleted', payload.id, 'category', payload as unknown as Record<string, unknown>);
  }
}
