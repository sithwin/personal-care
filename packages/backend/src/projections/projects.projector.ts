import { Pool } from 'pg';
import { StoredEvent } from '../types';

export async function projectsProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;
  switch (event.eventType) {
    case 'ProjectCreated':
      await pool.query(
        `INSERT INTO projects_view (id, name, description, category_id, due_date)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description ?? null, p.categoryId, p.dueDate ?? null]
      );
      break;
    case 'TaskAddedToProject':
      await pool.query(
        `UPDATE projects_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2`,
        [p.taskId, p.projectId]
      );
      break;
    case 'ProjectCompleted':
      await pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['done', p.id]);
      break;
    case 'TaskPromotedToProject':
      await pool.query(
        `UPDATE projects_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2`,
        [p.taskId, p.projectId]
      );
      break;
  }
}
