import type { Pool } from 'pg';
import type { IProjectViewRepository, InsertProjectData } from '../../../application/ports/IProjectViewRepository';

export class PgProjectViewRepository implements IProjectViewRepository {
  constructor(private readonly pool: Pool) {}

  async insert(data: InsertProjectData): Promise<void> {
    await this.pool.query(
      `INSERT INTO projects_view (id, name, description, category_id, due_date)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [data.id, data.name, data.description, data.categoryId, data.dueDate]
    );
  }

  async appendTask(projectId: string, taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE projects_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2`,
      [taskId, projectId]
    );
  }

  async markCompleted(id: string): Promise<void> {
    await this.pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['done', id]);
  }
}
