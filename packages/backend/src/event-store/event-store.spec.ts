import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EventStore } from './event-store';
import { Pool } from 'pg';

let pool: Pool;
let store: EventStore;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  store = new EventStore(pool);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      aggregate_id UUID NOT NULL,
      aggregate_type TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      version INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(aggregate_id, version)
    )
  `);
  await pool.query('TRUNCATE events RESTART IDENTITY');
});

afterAll(async () => { await pool.end(); });

describe('EventStore', () => {
  it('appends events and retrieves them', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    await store.append([
      { aggregateId: id, aggregateType: 'category', eventType: 'CategoryCreated', payload: { name: 'Home' } },
    ], 0);
    const events = await store.getEvents(id);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryCreated');
    expect(events[0].version).toBe(1);
  });

  it('throws on optimistic concurrency conflict', async () => {
    const id = '22222222-2222-2222-2222-222222222222';
    await store.append([
      { aggregateId: id, aggregateType: 'category', eventType: 'CategoryCreated', payload: { name: 'X' } },
    ], 0);
    await expect(
      store.append([
        { aggregateId: id, aggregateType: 'category', eventType: 'CategoryUpdated', payload: { name: 'Y' } },
      ], 0)
    ).rejects.toThrow('Concurrency conflict');
  });

  it('getAllEventsSince returns events after a given id', async () => {
    const all = await store.getAllEventsSince(0);
    expect(all.length).toBeGreaterThan(0);
  });
});
