import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateTaskCommand } from '../../../domain/task/commands/CreateTaskCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { Task } from '../../../domain/task/Task';

export class CreateTaskHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateTaskCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createTask.handle', payload: { id: cmd.payload.id } });
    const event = Task.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createTask.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
