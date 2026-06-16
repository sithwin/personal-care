import { DomainEvent } from '../../shared/DomainEvent';
import type { CompleteTaskCommand } from '../commands/CompleteTaskCommand';

export class TaskCompleted extends DomainEvent {
  constructor(readonly payload: CompleteTaskCommand['payload']) {
    super('TaskCompleted', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
