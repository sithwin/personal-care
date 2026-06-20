import type { StoredEvent, UUID } from '../../types';
import type { CreateResourceCommand } from './commands/CreateResourceCommand';
import type { UpdateResourceCommand } from './commands/UpdateResourceCommand';
import type { DeleteResourceCommand } from './commands/DeleteResourceCommand';
import { ResourceCreated } from './events/ResourceCreated';
import { ResourceUpdated } from './events/ResourceUpdated';
import { ResourceDeleted } from './events/ResourceDeleted';

interface ResourceState {
  readonly id: UUID;
}

export class Resource {
  private constructor(private readonly state: ResourceState) {}

  static reconstruct(history: StoredEvent[]): Resource | null {
    let state: ResourceState | null = null;
    for (const event of history) {
      if (event.eventType === 'ResourceCreated') {
        state = { id: event.aggregateId as UUID };
      }
    }
    return state !== null ? new Resource(state) : null;
  }

  static create(cmd: CreateResourceCommand): ResourceCreated {
    return new ResourceCreated(crypto.randomUUID() as UUID, cmd.payload);
  }

  update(cmd: UpdateResourceCommand): ResourceUpdated {
    return new ResourceUpdated(cmd.payload);
  }

  delete(cmd: DeleteResourceCommand): ResourceDeleted {
    return new ResourceDeleted(cmd.payload);
  }
}
