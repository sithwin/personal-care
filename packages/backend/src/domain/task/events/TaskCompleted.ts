import { DomainEvent } from '../../shared/DomainEvent';
import type { CompleteTask } from '../commands/CompleteTask';

export class TaskCompleted extends DomainEvent {
  constructor(readonly payload: CompleteTask['payload']) {
    super('TaskCompleted', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
