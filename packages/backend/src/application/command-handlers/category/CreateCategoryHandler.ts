import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateCategoryCommand } from '../../../domain/category/commands/CreateCategoryCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Category } from '../../../domain/category/Category';

export class CreateCategoryHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateCategoryCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createCategory.handle', payload: { id: cmd.payload.id } });
    const event = Category.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createCategory.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
