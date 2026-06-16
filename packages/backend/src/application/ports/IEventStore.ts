import type { DomainEvent } from '../../domain/shared/DomainEvent';
import type { StoredEvent } from '../../types';

export interface IEventStore {
  append(events: DomainEvent[], expectedVersion: number): Promise<StoredEvent[]>;
  getEvents(aggregateId: string): Promise<StoredEvent[]>;
  getAllEventsSince(afterId: number): Promise<StoredEvent[]>;
}
