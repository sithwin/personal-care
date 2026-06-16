import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateCategoryCommand } from '../../../domain/category/commands/CreateCategoryCommand';
import { Category } from '../../../domain/category/Category';

export class CreateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateCategoryCommand): Promise<StoredEvent[]> {
    const event = Category.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
