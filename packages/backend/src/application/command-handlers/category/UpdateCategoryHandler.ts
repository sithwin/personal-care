import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateCategoryCommand } from '../../../domain/category/commands/UpdateCategoryCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Category } from '../../../domain/category/Category';

export class UpdateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateCategoryCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'updateCategory.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Category.reconstruct(history);
    if (aggregate === null) throw new Error('Category not found');
    const event = aggregate.update(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'updateCategory.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
