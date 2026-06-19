import type { Pool } from 'pg';
import type { StoredEvent } from '../../types';
import type { IEventStore } from '../../application/ports/IEventStore';
import type { DomainEvent } from '../../domain/shared/DomainEvent';
import type { RequestContext } from '../../application/ports/RequestContext';

export class EventStore implements IEventStore {
  constructor(private readonly pool: Pool) {}

  async append(events: DomainEvent[], expectedVersion: number, ctx: RequestContext): Promise<StoredEvent[]> {
    if (events.length === 0) return [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const stored: StoredEvent[] = [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const version = expectedVersion + i + 1;
        try {
          const result = await client.query<StoredEvent>(
            `INSERT INTO events (aggregate_id, aggregate_type, event_type, payload, version)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
                       event_type as "eventType", payload, version, created_at as "createdAt"`,
            [event.aggregateId, event.aggregateType, event.eventType, JSON.stringify(event.payload), version],
          );
          stored.push(result.rows[0]);
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('unique')) {
            const msg = `Concurrency conflict on aggregate ${event.aggregateId} at version ${version}`;
            ctx.log.warn({ logEvent: 'eventStore.concurrencyConflict', aggregateId: event.aggregateId, version }, msg);
            throw new Error(msg);
          }
          ctx.log.error({ logEvent: 'eventStore.appendFailed', err, aggregateId: event.aggregateId }, 'Unexpected error appending event');
          throw err;
        }
      }
      await client.query('COMMIT');
      ctx.log.info({
        logEvent: 'eventStore.appended',
        aggregateId: events[0].aggregateId,
        eventTypes: stored.map(e => e.eventType),
        count: stored.length,
      });
      return stored;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE aggregate_id = $1 ORDER BY version ASC`,
      [aggregateId],
    );
    return result.rows;
  }

  async getAllEventsSince(afterId: number): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE id > $1 ORDER BY id ASC`,
      [afterId],
    );
    return result.rows;
  }
}
