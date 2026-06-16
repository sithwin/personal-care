import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateCategory } from '../commands/CreateCategory';

export class CategoryCreated extends DomainEvent {
  constructor(readonly payload: CreateCategory['payload']) {
    super('CategoryCreated', payload.id, 'category', payload as unknown as Record<string, unknown>);
  }
}
