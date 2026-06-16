import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateResource } from '../../../domain/resource/commands/UpdateResource';
import { Resource } from '../../../domain/resource/Resource';

export class UpdateResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateResource): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Resource.reconstruct(history);
    if (aggregate === null) throw new Error('Resource not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
