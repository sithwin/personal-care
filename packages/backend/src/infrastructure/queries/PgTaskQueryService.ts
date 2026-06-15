import { Pool } from 'pg';
import type { ITaskQueryService, TaskFilter, TaskView } from '../../application/ports/ITaskQueryService';

export class PgTaskQueryService implements ITaskQueryService {
  constructor(private readonly pool: Pool) {}

  async getAll(filter: TaskFilter): Promise<TaskView[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.status) {
      conditions.push(`t.status = $${params.length + 1}`);
      params.push(filter.status);
    }
    if (filter.categoryId) {
      conditions.push(`t.category_id = $${params.length + 1}`);
      params.push(filter.categoryId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = filter.sort === 'duration' ? 'estimated_duration_value ASC NULLS LAST'
      : filter.sort === 'category' ? 't.category_id ASC'
      : 'due_date ASC NULLS LAST';

    const result = await this.pool.query(
      `SELECT t.*,
              json_agg(DISTINCT jsonb_build_object('item_id', ti.item_id, 'consumable', ti.consumable, 'item_status', ti.item_status))
                FILTER (WHERE ti.item_id IS NOT NULL) as required_items,
              json_agg(DISTINCT jsonb_build_object('resource_id', tr.resource_id, 'title', tr.title, 'type', tr.type))
                FILTER (WHERE tr.resource_id IS NOT NULL) as resources
       FROM tasks_view t
       LEFT JOIN task_items_view ti ON ti.task_id = t.id
       LEFT JOIN task_resources_view tr ON tr.task_id = t.id
       ${where}
       GROUP BY t.id
       ORDER BY ${orderBy}`,
      params,
    );
    return result.rows;
  }

  async getById(id: string): Promise<TaskView | null> {
    const result = await this.pool.query(
      `SELECT t.*,
              json_agg(DISTINCT jsonb_build_object('item_id', ti.item_id, 'consumable', ti.consumable, 'item_status', ti.item_status))
                FILTER (WHERE ti.item_id IS NOT NULL) as required_items,
              json_agg(DISTINCT jsonb_build_object('resource_id', tr.resource_id, 'title', tr.title, 'type', tr.type))
                FILTER (WHERE tr.resource_id IS NOT NULL) as resources
       FROM tasks_view t
       LEFT JOIN task_items_view ti ON ti.task_id = t.id
       LEFT JOIN task_resources_view tr ON tr.task_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [id],
    );
    return result.rows[0] ?? null;
  }
}
