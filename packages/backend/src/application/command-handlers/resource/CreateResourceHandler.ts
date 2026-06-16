import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateResource } from '../../../domain/resource/commands/CreateResource';
import { Resource } from '../../../domain/resource/Resource';

export class CreateResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateResource): Promise<StoredEvent[]> {
    const event = Resource.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
