import type { Pool } from 'pg';
import type { IProjectViewRepository, InsertProjectData } from '../../../application/ports/IProjectViewRepository';

export class PgProjectViewRepository implements IProjectViewRepository {
  constructor(private readonly pool: Pool) {}

  async insert(data: InsertProjectData): Promise<void> {
    await this.pool.query(
      `INSERT INTO projects_view (id, name, description, category_id, due_date, status)
       VALUES ($1,$2,$3,$4,$5,'draft') ON CONFLICT (id) DO NOTHING`,
      [data.id, data.name, data.description, data.categoryId, data.dueDate],
    );
  }

  async appendTask(projectId: string, taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE projects_view SET task_ids = array_append(task_ids, $1::uuid) WHERE id = $2`,
      [taskId, projectId],
    );
  }

  async markCompleted(id: string): Promise<void> {
    await this.pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['done', id]);
  }

  async plan(id: string, startDate: string, endDate: string): Promise<void> {
    await this.pool.query(
      'UPDATE projects_view SET status = $1, start_date = $2, due_date = $3 WHERE id = $4',
      ['planned', startDate, endDate, id],
    );
  }

  async start(id: string, endDate: string | null): Promise<void> {
    await this.pool.query(
      'UPDATE projects_view SET status = $1, due_date = COALESCE($2, due_date) WHERE id = $3',
      ['active', endDate, id],
    );
  }

  async pause(id: string): Promise<void> {
    await this.pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['on_hold', id]);
  }

  async resume(id: string): Promise<void> {
    await this.pool.query('UPDATE projects_view SET status = $1 WHERE id = $2', ['active', id]);
  }

  async updateMeta(id: string, data: { name?: string | null; description?: string | null; priority?: string | null }): Promise<void> {
    await this.pool.query(
      `UPDATE projects_view SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         priority = COALESCE($3, priority)
       WHERE id = $4`,
      [data.name ?? null, data.description ?? null, data.priority ?? null, id],
    );
  }
}
