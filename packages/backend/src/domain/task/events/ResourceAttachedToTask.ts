import { DomainEvent } from '../../shared/DomainEvent';
import type { AttachResourceToTask } from '../commands/AttachResourceToTask';

export class ResourceAttachedToTask extends DomainEvent {
  constructor(readonly payload: AttachResourceToTask['payload']) {
    super('ResourceAttachedToTask', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
