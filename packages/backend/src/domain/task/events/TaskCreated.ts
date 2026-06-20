import { DomainEvent } from '../../shared/DomainEvent';
import type { UUID } from '../../../types';
import type { CreateTaskCommand } from '../commands/CreateTaskCommand';

export class TaskCreated extends DomainEvent {
  constructor(aggregateId: UUID, payload: CreateTaskCommand['payload']) {
    super('TaskCreated', aggregateId, 'task', payload as unknown as Record<string, unknown>);
  }
}
