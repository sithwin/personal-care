import { DomainEvent } from '../../shared/DomainEvent';
import type { DetachResourceFromTask } from '../commands/DetachResourceFromTask';

export class ResourceDetachedFromTask extends DomainEvent {
  constructor(readonly payload: DetachResourceFromTask['payload']) {
    super('ResourceDetachedFromTask', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
