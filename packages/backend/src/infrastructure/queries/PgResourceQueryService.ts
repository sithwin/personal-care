import { Pool } from 'pg';
import type { IResourceQueryService, ResourceFilter, ResourceView } from '../../application/ports/IResourceQueryService';

export class PgResourceQueryService implements IResourceQueryService {
  constructor(private readonly pool: Pool) {}

  async getAll(filter: ResourceFilter): Promise<ResourceView[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(filter.type);
    }
    if (filter.categoryId) {
      conditions.push(`category_id = $${params.length + 1}`);
      params.push(filter.categoryId);
    }
    if (filter.q) {
      conditions.push(`(title ILIKE $${params.length + 1} OR notes ILIKE $${params.length + 1})`);
      params.push(`%${filter.q}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM resources_view ${where} ORDER BY created_at DESC`,
      params,
    );
    return result.rows;
  }

  async getById(id: string): Promise<ResourceView | null> {
    const result = await this.pool.query('SELECT * FROM resources_view WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }
}
