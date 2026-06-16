import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateCategory } from '../../../domain/category/commands/UpdateCategory';
import { Category } from '../../../domain/category/Category';

export class UpdateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateCategory): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Category.reconstruct(history);
    if (aggregate === null) throw new Error('Category not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
