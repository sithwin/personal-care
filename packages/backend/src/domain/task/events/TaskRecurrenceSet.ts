import { DomainEvent } from '../../shared/DomainEvent';
import type { SetTaskRecurrenceCommand } from '../commands/SetTaskRecurrenceCommand';

export class TaskRecurrenceSet extends DomainEvent {
  constructor(readonly payload: SetTaskRecurrenceCommand['payload']) {
    super('TaskRecurrenceSet', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
