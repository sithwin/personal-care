import { DomainEvent } from '../../shared/DomainEvent';
import type { ScheduleTask } from '../commands/ScheduleTask';

export class TaskScheduled extends DomainEvent {
  constructor(readonly payload: ScheduleTask['payload']) {
    super('TaskScheduled', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
