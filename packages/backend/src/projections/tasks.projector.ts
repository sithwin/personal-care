import { Pool } from 'pg';
import { StoredEvent } from '../types';

async function deriveAndUpdateStatus(taskId: string, pool: Pool): Promise<void> {
  const taskRes = await pool.query('SELECT started_at, completed_at, due_date, recurrence_rule FROM tasks_view WHERE id = $1', [taskId]);
  if (taskRes.rows.length === 0) return;
  const task = taskRes.rows[0];

  const itemsRes = await pool.query('SELECT item_status FROM task_items_view WHERE task_id = $1', [taskId]);
  const hasPendingItems = itemsRes.rows.some((r: { item_status: string }) => r.item_status === 'to_buy');

  let status: string;
  if (task.completed_at && !task.recurrence_rule) {
    status = 'done';
  } else if (task.started_at && !task.completed_at) {
    status = 'ongoing';
  } else if (hasPendingItems) {
    status = 'pending';
  } else if (task.due_date && new Date(task.due_date) > new Date()) {
    status = 'planned';
  } else {
    status = 'ready';
  }

  await pool.query('UPDATE tasks_view SET status = $1 WHERE id = $2', [status, taskId]);
}

export async function tasksProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;

  switch (event.eventType) {
    case 'TaskCreated': {
      const dur = p.estimatedDuration as { value: number; unit: string } | undefined;
      await pool.query(
        `INSERT INTO tasks_view (id, name, description, category_id, project_id, due_date,
          estimated_duration_value, estimated_duration_unit, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ready')
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description ?? null, p.categoryId, p.projectId ?? null,
         p.dueDate ?? null, dur?.value ?? null, dur?.unit ?? null]
      );
      await deriveAndUpdateStatus(p.id as string, pool);
      break;
    }
    case 'TaskStarted':
      await pool.query('UPDATE tasks_view SET started_at = NOW() WHERE id = $1', [p.id]);
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'TaskCompleted':
      await pool.query('UPDATE tasks_view SET completed_at = NOW() WHERE id = $1', [p.id]);
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'TaskRescheduled':
      await pool.query(
        `UPDATE tasks_view SET started_at = NULL, completed_at = NULL,
         due_date = $1, completion_count = completion_count + 1 WHERE id = $2`,
        [p.nextDueDate, p.id]
      );
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'ItemRequirementAdded': {
      const itemRes = await pool.query('SELECT status FROM items_view WHERE id = $1', [p.itemId]);
      const itemStatus = itemRes.rows[0]?.status ?? 'to_buy';
      await pool.query(
        `INSERT INTO task_items_view (task_id, item_id, consumable, item_status)
         VALUES ($1,$2,$3,$4) ON CONFLICT (task_id, item_id) DO NOTHING`,
        [p.taskId, p.itemId, p.consumable, itemStatus]
      );
      await deriveAndUpdateStatus(p.taskId as string, pool);
      break;
    }

    case 'TaskScheduled':
      await pool.query(
        'UPDATE tasks_view SET scheduled_date = $1, scheduled_start_time = $2 WHERE id = $3',
        [p.scheduledDate, p.scheduledStartTime, p.id]
      );
      break;

    case 'TaskRecurrenceSet':
      await pool.query(
        'UPDATE tasks_view SET recurrence_rule = $1, due_date = COALESCE($2, due_date) WHERE id = $3',
        [JSON.stringify(p.recurrenceRule), p.dueDate ?? null, p.id]
      );
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'RecurrenceSkipped':
      await pool.query('UPDATE tasks_view SET due_date = $1 WHERE id = $2', [p.nextDueDate, p.id]);
      await deriveAndUpdateStatus(p.id as string, pool);
      break;

    case 'TaskPromotedToProject':
      await pool.query('UPDATE tasks_view SET project_id = $1 WHERE id = $2', [p.projectId, p.taskId]);
      break;
  }
}
