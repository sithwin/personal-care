import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateTaskCommand } from '../commands/UpdateTaskCommand';

export class TaskUpdated extends DomainEvent {
  constructor(readonly payload: UpdateTaskCommand['payload']) {
    super('TaskUpdated', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
