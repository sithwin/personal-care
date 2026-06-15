import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeTasksRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, categoryId, sort } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (status) { conditions.push(`t.status = $${params.length + 1}`); params.push(status); }
      if (categoryId) { conditions.push(`t.category_id = $${params.length + 1}`); params.push(categoryId); }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderBy = sort === 'duration' ? 'estimated_duration_value ASC NULLS LAST'
        : sort === 'category' ? 't.category_id ASC'
        : 'due_date ASC NULLS LAST';
      const result = await pool.query(
        `SELECT t.*,
                json_agg(DISTINCT jsonb_build_object('itemId', ti.item_id, 'consumable', ti.consumable, 'itemStatus', ti.item_status))
                  FILTER (WHERE ti.item_id IS NOT NULL) as required_items,
                json_agg(DISTINCT jsonb_build_object('resourceId', tr.resource_id, 'title', tr.title, 'type', tr.type))
                  FILTER (WHERE tr.resource_id IS NOT NULL) as resources
         FROM tasks_view t
         LEFT JOIN task_items_view ti ON ti.task_id = t.id
         LEFT JOIN task_resources_view tr ON tr.task_id = t.id
         ${where}
         GROUP BY t.id
         ORDER BY ${orderBy}`,
        params
      );
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT t.*,
                json_agg(DISTINCT jsonb_build_object('itemId', ti.item_id, 'consumable', ti.consumable, 'itemStatus', ti.item_status))
                  FILTER (WHERE ti.item_id IS NOT NULL) as required_items,
                json_agg(DISTINCT jsonb_build_object('resourceId', tr.resource_id, 'title', tr.title, 'type', tr.type))
                  FILTER (WHERE tr.resource_id IS NOT NULL) as resources
         FROM tasks_view t
         LEFT JOIN task_items_view ti ON ti.task_id = t.id
         LEFT JOIN task_resources_view tr ON tr.task_id = t.id
         WHERE t.id = $1
         GROUP BY t.id`,
        [req.params.id]
      );
      if (result.rows.length === 0) { res.status(404).json({ error: 'Task not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
