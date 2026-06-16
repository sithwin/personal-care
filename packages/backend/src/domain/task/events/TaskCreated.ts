import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateTaskCommand } from '../commands/CreateTaskCommand';

export class TaskCreated extends DomainEvent {
  constructor(readonly payload: CreateTaskCommand['payload']) {
    super('TaskCreated', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
