import { DomainEvent } from '../../shared/DomainEvent';
import type { PromoteToProject } from '../commands/PromoteToProject';

export class TaskPromotedToProject extends DomainEvent {
  constructor(readonly payload: PromoteToProject['payload']) {
    super('TaskPromotedToProject', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
