import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { EventStore } from '../../src/event-store/event-store';
import { CommandBus } from '../../src/command-bus/command-bus';

let pool: Pool;
let bus: CommandBus;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  const store = new EventStore(pool);
  bus = new CommandBus(store, pool);
  await pool.query('TRUNCATE events RESTART IDENTITY');
});

afterAll(async () => { await pool.end(); });

describe('CommandBus', () => {
  it('dispatches CreateCategory and returns stored events', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    const events = await bus.dispatch({ type: 'CreateCategory', payload: { id, name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false } });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryCreated');
    expect(events[0].id).toBeGreaterThan(0);
  });

  it('dispatches CreateTask and returns stored events', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const catId = uuidv4();
    await bus.dispatch({ type: 'CreateCategory', payload: { id: catId, name: 'Cars', icon: '🚗', color: '#3b82f6', isDefault: false } });
    const taskId = uuidv4();
    const events = await bus.dispatch({ type: 'CreateTask', payload: { id: taskId, name: 'Oil change', categoryId: catId } });
    expect(events[0].eventType).toBe('TaskCreated');
  });
});
