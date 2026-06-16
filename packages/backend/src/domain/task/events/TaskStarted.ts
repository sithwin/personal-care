import { DomainEvent } from '../../shared/DomainEvent';
import type { StartTask } from '../commands/StartTask';

export class TaskStarted extends DomainEvent {
  constructor(readonly payload: StartTask['payload']) {
    super('TaskStarted', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
