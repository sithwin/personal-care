import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateResourceCommand } from '../../../domain/resource/commands/CreateResourceCommand';
import { Resource } from '../../../domain/resource/Resource';

export class CreateResourceHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateResourceCommand): Promise<StoredEvent[]> {
    const event = Resource.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
