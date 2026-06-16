import { DomainEvent } from '../../shared/DomainEvent';
import type { AttachResourceToTaskCommand } from '../commands/AttachResourceToTaskCommand';

export class ResourceAttachedToTask extends DomainEvent {
  constructor(readonly payload: AttachResourceToTaskCommand['payload']) {
    super('ResourceAttachedToTask', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
