import { DomainEvent } from '../../shared/DomainEvent';
import type { UUID } from '../../../types';
import type { CreateCategoryCommand } from '../commands/CreateCategoryCommand';

export class CategoryCreated extends DomainEvent {
  constructor(aggregateId: UUID, payload: CreateCategoryCommand['payload']) {
    super('CategoryCreated', aggregateId, 'category', payload as unknown as Record<string, unknown>);
  }
}
