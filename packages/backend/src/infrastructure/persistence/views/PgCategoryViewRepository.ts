import type { Pool } from 'pg';
import type { ICategoryViewRepository, InsertCategoryData, UpdateCategoryData } from '../../../application/ports/ICategoryViewRepository';

export class PgCategoryViewRepository implements ICategoryViewRepository {
  constructor(private readonly pool: Pool) {}

  async insert(data: InsertCategoryData): Promise<void> {
    await this.pool.query(
      `INSERT INTO categories_view (id, name, icon, color, is_default)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [data.id, data.name, data.icon, data.color, data.isDefault]
    );
  }

  async update(id: string, data: UpdateCategoryData): Promise<void> {
    await this.pool.query(
      `UPDATE categories_view SET
       name = COALESCE($1, name), icon = COALESCE($2, icon), color = COALESCE($3, color)
       WHERE id = $4`,
      [data.name, data.icon, data.color, id]
    );
  }

  async markDeleted(id: string): Promise<void> {
    await this.pool.query('UPDATE categories_view SET deleted = true WHERE id = $1', [id]);
  }

  async incrementTaskCount(categoryId: string): Promise<void> {
    await this.pool.query(
      'UPDATE categories_view SET task_count = task_count + 1 WHERE id = $1',
      [categoryId]
    );
  }

  async incrementItemCount(categoryId: string): Promise<void> {
    await this.pool.query(
      'UPDATE categories_view SET item_count = item_count + 1 WHERE id = $1',
      [categoryId]
    );
  }
}
