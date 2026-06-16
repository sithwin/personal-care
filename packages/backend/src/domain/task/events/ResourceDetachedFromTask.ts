import { DomainEvent } from '../../shared/DomainEvent';
import type { DetachResourceFromTaskCommand } from '../commands/DetachResourceFromTaskCommand';

export class ResourceDetachedFromTask extends DomainEvent {
  constructor(readonly payload: DetachResourceFromTaskCommand['payload']) {
    super('ResourceDetachedFromTask', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
