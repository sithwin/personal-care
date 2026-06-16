import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateResource } from '../commands/UpdateResource';

export class ResourceUpdated extends DomainEvent {
  constructor(readonly payload: UpdateResource['payload']) {
    super('ResourceUpdated', payload.id, 'resource', payload as unknown as Record<string, unknown>);
  }
}
