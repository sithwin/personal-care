import type { StoredEvent, UUID } from '../../types';
import type { CreateResource } from './commands/CreateResource';
import type { UpdateResource } from './commands/UpdateResource';
import type { DeleteResource } from './commands/DeleteResource';
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
        state = { id: event.payload.id as UUID };
      }
    }
    return state !== null ? new Resource(state) : null;
  }

  static create(cmd: CreateResource): ResourceCreated {
    return new ResourceCreated(cmd.payload);
  }

  update(cmd: UpdateResource): ResourceUpdated {
    return new ResourceUpdated(cmd.payload);
  }

  delete(cmd: DeleteResource): ResourceDeleted {
    return new ResourceDeleted(cmd.payload);
  }
}
