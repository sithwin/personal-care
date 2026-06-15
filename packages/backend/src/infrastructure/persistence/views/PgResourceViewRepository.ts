import type { Pool } from 'pg';
import type { IResourceViewRepository, InsertResourceData, UpdateResourceData } from '../../../application/ports/IResourceViewRepository';

export class PgResourceViewRepository implements IResourceViewRepository {
  constructor(private readonly pool: Pool) {}

  async insert(data: InsertResourceData): Promise<void> {
    await this.pool.query(
      `INSERT INTO resources_view (id, title, type, url, notes, category_id)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [data.id, data.title, data.type, data.url, data.notes, data.categoryId]
    );
  }

  async update(id: string, data: UpdateResourceData): Promise<void> {
    await this.pool.query(
      `UPDATE resources_view SET
       title = COALESCE($1, title), url = COALESCE($2, url), notes = COALESCE($3, notes)
       WHERE id = $4`,
      [data.title, data.url, data.notes, id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM resources_view WHERE id = $1', [id]);
  }

  async findTitleAndType(id: string): Promise<{ title: string; type: string } | null> {
    const res = await this.pool.query('SELECT title, type FROM resources_view WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return { title: res.rows[0].title as string, type: res.rows[0].type as string };
  }

  async insertTaskResource(taskId: string, resourceId: string, title: string, type: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO task_resources_view (task_id, resource_id, title, type)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [taskId, resourceId, title, type]
    );
  }

  async deleteTaskResource(taskId: string, resourceId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM task_resources_view WHERE task_id = $1 AND resource_id = $2',
      [taskId, resourceId]
    );
  }

  async appendTaskId(resourceId: string, taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE resources_view SET task_ids = array_append(task_ids, $1::uuid)
       WHERE id = $2 AND NOT ($1::uuid = ANY(task_ids))`,
      [taskId, resourceId]
    );
  }

  async removeTaskId(resourceId: string, taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE resources_view SET task_ids = array_remove(task_ids, $1::uuid) WHERE id = $2`,
      [taskId, resourceId]
    );
  }
}
