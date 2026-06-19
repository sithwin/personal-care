import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteCategoryCommand } from '../../../domain/category/commands/DeleteCategoryCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Category } from '../../../domain/category/Category';

export class DeleteCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DeleteCategoryCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'deleteCategory.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Category.reconstruct(history);
    if (aggregate === null) throw new Error('Category not found');
    const event = aggregate.delete(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'deleteCategory.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
