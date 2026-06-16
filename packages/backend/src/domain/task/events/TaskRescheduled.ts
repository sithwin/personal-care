import { DomainEvent } from '../../shared/DomainEvent';

export class TaskRescheduled extends DomainEvent {
  constructor(readonly payload: { id: string; nextDueDate: string }) {
    super('TaskRescheduled', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
