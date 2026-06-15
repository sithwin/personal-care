import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { createTasksProjector } from './tasks.projector';
import { PgTaskViewRepository } from '../persistence/views/PgTaskViewRepository';
import { PgItemViewRepository } from '../persistence/views/PgItemViewRepository';

const CAT_ID  = '00000000-0000-0000-0000-000000000001';
const TASK_ID = '00000000-0000-0000-0000-000000000002';
const ITEM_ID = '00000000-0000-0000-0000-000000000003';

let pool: Pool;
let tasksProjector: ReturnType<typeof createTasksProjector>;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/personal_care' });
  tasksProjector = createTasksProjector(new PgTaskViewRepository(pool), new PgItemViewRepository(pool));
});
afterAll(async () => { await pool.end(); });
beforeEach(async () => {
  await pool.query('TRUNCATE tasks_view, task_items_view, items_view, categories_view RESTART IDENTITY');
  await pool.query(`INSERT INTO categories_view (id, name, icon, color) VALUES ($1, 'Cars', '🚗', '#3b82f6') ON CONFLICT DO NOTHING`, [CAT_ID]);
});

describe('Tasks projector', () => {
  it('TaskCreated inserts task with status ready', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    const row = await pool.query('SELECT * FROM tasks_view WHERE id = $1', [TASK_ID]);
    expect(row.rows[0].name).toBe('Oil change');
    expect(row.rows[0].status).toBe('ready');
  });

  it('TaskStarted sets status to ongoing', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskStarted', payload: { id: TASK_ID }, version: 2, createdAt: new Date() });
    const row = await pool.query('SELECT status FROM tasks_view WHERE id = $1', [TASK_ID]);
    expect(row.rows[0].status).toBe('ongoing');
  });

  it('TaskCompleted sets status to done for non-recurring', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: TASK_ID, itemDisposals: [] }, version: 2, createdAt: new Date() });
    const row = await pool.query('SELECT status FROM tasks_view WHERE id = $1', [TASK_ID]);
    expect(row.rows[0].status).toBe('done');
  });

  it('TaskRescheduled resets task to planned with new due date', async () => {
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Oil change', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCompleted', payload: { id: TASK_ID, itemDisposals: [] }, version: 2, createdAt: new Date() });
    const nextDueDate = new Date('2027-06-14').toISOString();
    await tasksProjector({ id: 3, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskRescheduled', payload: { id: TASK_ID, nextDueDate }, version: 3, createdAt: new Date() });
    const row = await pool.query('SELECT status, completion_count, due_date FROM tasks_view WHERE id = $1', [TASK_ID]);
    expect(row.rows[0].status).toBe('planned');
    expect(row.rows[0].completion_count).toBe(1);
  });

  it('ItemRequirementAdded inserts into task_items_view and sets task to pending', async () => {
    await pool.query(`INSERT INTO items_view (id, name, category_id, status) VALUES ($1, 'Solar light', $2, 'to_buy') ON CONFLICT DO NOTHING`, [ITEM_ID, CAT_ID]);
    await tasksProjector({ id: 1, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'TaskCreated', payload: { id: TASK_ID, name: 'Set up solar light', categoryId: CAT_ID }, version: 1, createdAt: new Date() });
    await tasksProjector({ id: 2, aggregateId: TASK_ID, aggregateType: 'task', eventType: 'ItemRequirementAdded', payload: { taskId: TASK_ID, itemId: ITEM_ID, consumable: true }, version: 2, createdAt: new Date() });
    const row = await pool.query('SELECT status FROM tasks_view WHERE id = $1', [TASK_ID]);
    expect(row.rows[0].status).toBe('pending');
  });
});
