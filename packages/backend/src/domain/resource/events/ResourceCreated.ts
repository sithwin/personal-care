import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateResourceCommand } from '../commands/CreateResourceCommand';

export class ResourceCreated extends DomainEvent {
  constructor(readonly payload: CreateResourceCommand['payload']) {
    super('ResourceCreated', payload.id, 'resource', payload as unknown as Record<string, unknown>);
  }
}
