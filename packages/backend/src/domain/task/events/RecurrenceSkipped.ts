import { DomainEvent } from '../../shared/DomainEvent';

export class RecurrenceSkipped extends DomainEvent {
  constructor(readonly payload: { id: string; nextDueDate: string }) {
    super('RecurrenceSkipped', payload.id, 'task', payload as unknown as Record<string, unknown>);
  }
}
