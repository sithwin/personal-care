import { type Pool } from 'pg';
import { type StoredEvent } from '../types';

export async function categoriesProjector(event: StoredEvent, pool: Pool): Promise<void> {
  const p = event.payload as Record<string, unknown>;
  switch (event.eventType) {
    case 'CategoryCreated':
      await pool.query(
        `INSERT INTO categories_view (id, name, icon, color, is_default)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.icon ?? '📂', p.color ?? '#6b7280', p.isDefault ?? false]
      );
      break;
    case 'CategoryUpdated':
      await pool.query(
        `UPDATE categories_view SET
         name = COALESCE($1, name), icon = COALESCE($2, icon), color = COALESCE($3, color)
         WHERE id = $4`,
        [p.name ?? null, p.icon ?? null, p.color ?? null, p.id]
      );
      break;
    case 'CategoryDeleted':
      await pool.query('UPDATE categories_view SET deleted = true WHERE id = $1', [p.id]);
      break;
    case 'TaskCreated':
      await pool.query('UPDATE categories_view SET task_count = task_count + 1 WHERE id = $1', [p.categoryId]);
      break;
    case 'ItemCreated':
      await pool.query('UPDATE categories_view SET item_count = item_count + 1 WHERE id = $1', [p.categoryId]);
      break;

    default:
      break;
  }
}
