import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteResource } from '../commands/DeleteResource';

export class ResourceDeleted extends DomainEvent {
  constructor(readonly payload: DeleteResource['payload']) {
    super('ResourceDeleted', payload.id, 'resource', payload as unknown as Record<string, unknown>);
  }
}
