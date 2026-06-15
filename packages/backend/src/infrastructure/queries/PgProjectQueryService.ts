import { type Pool } from 'pg';
import type { IProjectQueryService, ProjectFilter, ProjectView } from '../../application/ports/IProjectQueryService';

export class PgProjectQueryService implements IProjectQueryService {
  constructor(private readonly pool: Pool) {}

  async getAll(filter: ProjectFilter): Promise<ProjectView[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(filter.status);
    }
    if (filter.categoryId) {
      conditions.push(`category_id = $${params.length + 1}`);
      params.push(filter.categoryId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM projects_view ${where} ORDER BY created_at DESC`,
      params,
    );
    return result.rows;
  }

  async getById(id: string): Promise<ProjectView | null> {
    const result = await this.pool.query('SELECT * FROM projects_view WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }
}
