import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateCategoryCommand } from '../commands/UpdateCategoryCommand';

export class CategoryUpdated extends DomainEvent {
  constructor(readonly payload: UpdateCategoryCommand['payload']) {
    super('CategoryUpdated', payload.id, 'category', payload as unknown as Record<string, unknown>);
  }
}
