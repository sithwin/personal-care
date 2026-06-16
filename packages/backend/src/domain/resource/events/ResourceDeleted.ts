import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteResourceCommand } from '../commands/DeleteResourceCommand';

export class ResourceDeleted extends DomainEvent {
  constructor(readonly payload: DeleteResourceCommand['payload']) {
    super('ResourceDeleted', payload.id, 'resource', payload as unknown as Record<string, unknown>);
  }
}
