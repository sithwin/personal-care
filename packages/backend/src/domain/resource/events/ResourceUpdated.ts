import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateResourceCommand } from '../commands/UpdateResourceCommand';

export class ResourceUpdated extends DomainEvent {
  constructor(readonly payload: UpdateResourceCommand['payload']) {
    super('ResourceUpdated', payload.id, 'resource', payload as unknown as Record<string, unknown>);
  }
}
