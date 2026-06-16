import { DomainEvent } from '../../shared/DomainEvent';
import type { StartTaskCommand } from '../commands/StartTaskCommand';

export class TaskStarted extends DomainEvent {
  constructor(readonly payload: StartTaskCommand['payload']) {
    super('TaskStarted', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
