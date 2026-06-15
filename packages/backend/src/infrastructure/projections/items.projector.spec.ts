import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { createItemsProjector } from './items.projector';
import { createTasksProjector } from './tasks.projector';

const CAT_ID  = '00000000-0000-0000-0000-000000000001';
const TASK_ID = '00000000-0000-0000-0000-000000000002';
const ITEM_ID = '00000000-0000-0000-0000-000000000003';

let pool: Pool;
let itemsProjector: ReturnType<typeof createItemsProjector>;
let tasksProjector: ReturnType<typeof createTasksProjector>;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  itemsProjector = createItemsProjector(pool);
  tasksProjector = createTasksProjector(pool);
});
afterAll(async () => { await pool.end(); });
beforeEach(async () => {
  await pool.query('TRUNCATE tasks_view, items_view, task_items_view, categories_view RESTART IDENTITY');
  await pool.query(`INSERT INTO categories_view (id, name, icon, color) VALUES ($1, 'Home', '🏠', '#22c55e') ON CONFLICT DO NOTHING`, [CAT_ID]);
});

describe('Items projector', () => {
  it('ItemCreated inserts item with status to_buy', async () => {
    await itemsProjector({ id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemCreated', payload: { id: ITEM_ID, name: 'Solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    const row = await pool.query('SELECT status FROM items_view WHERE id = $1', [ITEM_ID]);
    expect(row.rows[0].status).toBe('to_buy');
  });

  it('MarkItemAvailable updates item and unblocks tasks', async () => {
    await itemsProjector({ id: 1, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemCreated', payload: { id: ITEM_ID, name: 'Solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Set up solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 3, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: TASK_ID, itemId: ITEM_ID, consumable: true }, version: 2, createdAt: new Date() });
    const before = await pool.query('SELECT status FROM tasks_view WHERE id = $1', [TASK_ID]);
    expect(before.rows[0].status).toBe('pending');
    await itemsProjector({ id: 4, aggregateId: ITEM_ID, aggregateType: 'item', eventType: 'ItemMarkedAvailable', payload: { id: ITEM_ID }, version: 2, createdAt: new Date() });
    const after = await pool.query('SELECT status FROM tasks_view WHERE id = $1', [TASK_ID]);
    expect(after.rows[0].status).toBe('ready');
  });
});
