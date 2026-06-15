import { type Pool } from 'pg';
import type { IItemQueryService, ItemFilter, ItemView } from '../../application/ports/IItemQueryService';

export class PgItemQueryService implements IItemQueryService {
  constructor(private readonly pool: Pool) {}

  async getAll(filter: ItemFilter): Promise<ItemView[]> {
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
    const result = await this.pool.query(`SELECT * FROM items_view ${where} ORDER BY name ASC`, params);
    return result.rows;
  }

  async getById(id: string): Promise<ItemView | null> {
    const result = await this.pool.query('SELECT * FROM items_view WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }
}
