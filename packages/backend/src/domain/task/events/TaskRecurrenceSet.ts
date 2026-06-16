import { DomainEvent } from '../../shared/DomainEvent';
import type { SetTaskRecurrence } from '../commands/SetTaskRecurrence';

export class TaskRecurrenceSet extends DomainEvent {
  constructor(readonly payload: SetTaskRecurrence['payload']) {
    super('TaskRecurrenceSet', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
