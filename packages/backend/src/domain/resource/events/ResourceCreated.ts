import { DomainEvent } from '../../shared/DomainEvent';
import type { UUID } from '../../../types';
import type { CreateResourceCommand } from '../commands/CreateResourceCommand';

export class ResourceCreated extends DomainEvent {
  constructor(aggregateId: UUID, payload: CreateResourceCommand['payload']) {
    super('ResourceCreated', aggregateId, 'resource', payload as unknown as Record<string, unknown>);
  }
}
