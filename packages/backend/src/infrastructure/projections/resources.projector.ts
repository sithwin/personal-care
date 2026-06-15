import type { Pool } from 'pg';
import type { Projector } from '../../application/ports/IProjector';

export function createResourcesProjector(pool: Pool): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ResourceCreated':
        await pool.query(
          `INSERT INTO resources_view (id, title, type, url, notes, category_id)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
          [p.id, p.title, p.type, p.url ?? null, p.notes ?? null, p.categoryId ?? null]
        );
        break;
      case 'ResourceUpdated':
        await pool.query(
          `UPDATE resources_view SET
           title = COALESCE($1, title), url = COALESCE($2, url), notes = COALESCE($3, notes)
           WHERE id = $4`,
          [p.title ?? null, p.url ?? null, p.notes ?? null, p.id]
        );
        break;
      case 'ResourceDeleted':
        await pool.query('DELETE FROM resources_view WHERE id = $1', [p.id]);
        break;
      case 'ResourceAttachedToTask': {
        const res = await pool.query('SELECT title, type FROM resources_view WHERE id = $1', [p.resourceId]);
        if (res.rows.length === 0) break;
        await pool.query(
          `INSERT INTO task_resources_view (task_id, resource_id, title, type)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [p.taskId, p.resourceId, res.rows[0].title, res.rows[0].type]
        );
        await pool.query(
          `UPDATE resources_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2 AND NOT ($1::uuid = ANY(task_ids))`,
          [p.taskId, p.resourceId]
        );
        break;
      }
      case 'ResourceDetachedFromTask':
        await pool.query('DELETE FROM task_resources_view WHERE task_id = $1 AND resource_id = $2', [p.taskId, p.resourceId]);
        await pool.query(
          `UPDATE resources_view SET task_ids = array_remove(task_ids, $1::uuid) WHERE id = $2`,
          [p.taskId, p.resourceId]
        );
        break;

      default:
        break;
    }
  };
}
