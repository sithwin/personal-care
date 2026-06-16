import { DomainEvent } from '../../shared/DomainEvent';
import type { PromoteToProjectCommand } from '../commands/PromoteToProjectCommand';

export class TaskPromotedToProject extends DomainEvent {
  constructor(readonly payload: PromoteToProjectCommand['payload']) {
    super('TaskPromotedToProject', payload.taskId, 'task', payload as unknown as Record<string, unknown>);
  }
}
