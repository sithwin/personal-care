import { Pool } from 'pg';
import type { ICategoryQueryService, CategoryView } from '../../application/ports/ICategoryQueryService';

export class PgCategoryQueryService implements ICategoryQueryService {
  constructor(private readonly pool: Pool) {}

  async getAll(): Promise<CategoryView[]> {
    const result = await this.pool.query(
      'SELECT * FROM categories_view WHERE deleted = false ORDER BY name ASC',
    );
    return result.rows;
  }

  async getById(id: string): Promise<CategoryView | null> {
    const result = await this.pool.query(
      'SELECT * FROM categories_view WHERE id = $1 AND deleted = false',
      [id],
    );
    return result.rows[0] ?? null;
  }
}
