import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateCategory } from '../../../domain/category/commands/CreateCategory';
import { Category } from '../../../domain/category/Category';

export class CreateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateCategory): Promise<StoredEvent[]> {
    const event = Category.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
