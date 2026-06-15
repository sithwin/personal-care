import { type Pool } from 'pg';
import { type StoredEvent } from '../types';

async function updateTasksForItem(itemId: string, newStatus: string, pool: Pool): Promise<void> {
  await pool.query('UPDATE task_items_view SET item_status = $1 WHERE item_id = $2', [newStatus, itemId]);
  const affected = await pool.query('SELECT task_id FROM task_items_view WHERE item_id = $1', [itemId]);
  for (const row of affected.rows) {
    const taskRes = await pool.query('SELECT started_at, completed_at, due_date, recurrence_rule FROM tasks_view WHERE id = $1', [row.task_id]);
    if (taskRes.rows.length === 0) continue;
    const task = taskRes.rows[0];
    const itemsRes = await pool.query('SELECT item_status FROM task_items_view WHERE task_id = $1', [row.task_id]);
    const hasPendingItems = itemsRes.rows.some((r: { item_status: string }) => r.item_status === 'to_buy');
    let status: string;
    if (task.completed_at && !task.recurrence_rule) status = 'done';
    else if (task.started_at && !task.completed_at) status = 'ongoing';
    else if (hasPendingItems) status = 'pending';
    else if (task.due_date && new Date(task.due_date) > new Date()) status = 'planned';
    else status = 'ready';
    await pool.query('UPDATE tasks_view SET status = $1 WHERE id = $2', [status, row.task_id]);
  }
}

export async function itemsProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;

  switch (event.eventType) {
    case 'ItemCreated':
      await pool.query(
        `INSERT INTO items_view (id, name, description, category_id, status, quantity, price, notes)
         VALUES ($1,$2,$3,$4,'to_buy',$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description ?? null, p.categoryId, p.quantity ?? null, p.price ?? null, p.notes ?? null]
      );
      break;

    case 'ItemMarkedAvailable':
      await pool.query('UPDATE items_view SET status = $1 WHERE id = $2', ['available', p.id]);
      await updateTasksForItem(p.id as string, 'available', pool);
      break;

    case 'ItemMarkedAvailableAgain':
      await pool.query('UPDATE items_view SET status = $1 WHERE id = $2', ['available', p.id]);
      await updateTasksForItem(p.id as string, 'available', pool);
      break;

    case 'ItemMarkedConsumed':
      await pool.query('UPDATE items_view SET status = $1 WHERE id = $2', ['consumed', p.id]);
      await updateTasksForItem(p.id as string, 'consumed', pool);
      break;

    default:
      break;
  }
}
