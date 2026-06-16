import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateTask } from '../commands/CreateTask';

export class TaskCreated extends DomainEvent {
  constructor(readonly payload: CreateTask['payload']) {
    super('TaskCreated', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
