import { DomainEvent } from '../../shared/DomainEvent';
import type { ScheduleTaskCommand } from '../commands/ScheduleTaskCommand';

export class TaskScheduled extends DomainEvent {
  constructor(readonly payload: ScheduleTaskCommand['payload']) {
    super('TaskScheduled', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
