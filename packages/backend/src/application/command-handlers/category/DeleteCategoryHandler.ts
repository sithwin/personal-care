import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteCategory } from '../../../domain/category/commands/DeleteCategory';
import { Category } from '../../../domain/category/Category';

export class DeleteCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DeleteCategory): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Category.reconstruct(history);
    if (aggregate === null) throw new Error('Category not found');
    const event = aggregate.delete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
