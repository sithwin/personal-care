import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteResource } from '../../../domain/resource/commands/DeleteResource';
import { Resource } from '../../../domain/resource/Resource';

export class DeleteResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DeleteResource): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = Resource.reconstruct(history);
    if (aggregate === null) throw new Error('Resource not found');
    const event = aggregate.delete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
