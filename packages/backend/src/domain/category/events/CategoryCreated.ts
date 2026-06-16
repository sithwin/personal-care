import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateCategoryCommand } from '../commands/CreateCategoryCommand';

export class CategoryCreated extends DomainEvent {
  constructor(readonly payload: CreateCategoryCommand['payload']) {
    super('CategoryCreated', payload.id, 'category', payload as unknown as Record<string, unknown>);
  }
}
