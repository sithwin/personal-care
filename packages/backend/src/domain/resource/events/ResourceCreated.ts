import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateResource } from '../commands/CreateResource';

export class ResourceCreated extends DomainEvent {
  constructor(readonly payload: CreateResource['payload']) {
    super('ResourceCreated', payload.id, 'resource', payload as unknown as Record<string, unknown>);
  }
}
