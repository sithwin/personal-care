import type { DomainEvent } from '../../domain/shared/DomainEvent';
import type { StoredEvent } from '../../types';
import type { RequestContext } from './RequestContext';

export interface IEventStore {
  append(events: DomainEvent[], expectedVersion: number, ctx: RequestContext): Promise<StoredEvent[]>;
  getEvents(aggregateId: string): Promise<StoredEvent[]>;
  getAllEventsSince(afterId: number): Promise<StoredEvent[]>;
}
