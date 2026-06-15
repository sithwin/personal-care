import { DomainEvent, StoredEvent } from '../../types';

export interface IEventStore {
  append(events: DomainEvent[], expectedVersion: number): Promise<StoredEvent[]>;
  getEvents(aggregateId: string): Promise<StoredEvent[]>;
  getAllEventsSince(afterId: number): Promise<StoredEvent[]>;
}
