import type { Pool } from 'pg';
import type { IItemViewRepository, InsertItemData } from '../../../application/ports/IItemViewRepository';

export class PgItemViewRepository implements IItemViewRepository {
  constructor(private readonly pool: Pool) {}

  async insert(data: InsertItemData): Promise<void> {
    await this.pool.query(
      `INSERT INTO items_view (id, name, description, category_id, status, quantity, price, notes)
       VALUES ($1,$2,$3,$4,'to_buy',$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [data.id, data.name, data.description, data.categoryId, data.quantity, data.price, data.notes]
    );
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.pool.query('UPDATE items_view SET status = $1 WHERE id = $2', [status, id]);
  }

  async findStatus(id: string): Promise<string | null> {
    const res = await this.pool.query('SELECT status FROM items_view WHERE id = $1', [id]);
    return (res.rows[0]?.status as string | undefined) ?? null;
  }
}
