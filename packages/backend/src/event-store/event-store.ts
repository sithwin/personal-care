import { Pool } from 'pg';
import { DomainEvent, StoredEvent } from '../types';

export class EventStore {
  constructor(private pool: Pool) {}

  async append(events: DomainEvent[], expectedVersion: number): Promise<StoredEvent[]> {
    if (events.length === 0) return [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const stored: StoredEvent[] = [];
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        const version = expectedVersion + i + 1;
        try {
          const result = await client.query<StoredEvent>(
            `INSERT INTO events (aggregate_id, aggregate_type, event_type, payload, version)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
                       event_type as "eventType", payload, version, created_at as "createdAt"`,
            [e.aggregateId, e.aggregateType, e.eventType, JSON.stringify(e.payload), version]
          );
          stored.push(result.rows[0]);
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('unique')) {
            throw new Error(`Concurrency conflict on aggregate ${e.aggregateId} at version ${version}`);
          }
          throw err;
        }
      }
      await client.query('COMMIT');
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
      [aggregateId]
    );
    return result.rows;
  }

  async getAllEventsSince(afterId: number): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT id::INT, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
              event_type as "eventType", payload, version, created_at as "createdAt"
       FROM events WHERE id > $1 ORDER BY id ASC`,
      [afterId]
    );
    return result.rows;
  }
}
