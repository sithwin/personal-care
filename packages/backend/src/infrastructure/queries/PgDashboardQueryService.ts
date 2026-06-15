import { Pool } from 'pg';
import type { IDashboardQueryService, DashboardView } from '../../application/ports/IDashboardQueryService';

export class PgDashboardQueryService implements IDashboardQueryService {
  constructor(private readonly pool: Pool) {}

  async get(): Promise<DashboardView> {
    const [counts, balance, upNext] = await Promise.all([
      this.pool.query('SELECT * FROM dashboard_view WHERE id = 1'),
      this.pool.query(`
        SELECT bs.rule_id, bs.category_id, bs.frequency, bs.is_met,
               c.name as category_name, c.icon as category_icon
        FROM balance_status_view bs
        LEFT JOIN categories_view c ON c.id = bs.category_id
      `),
      this.pool.query(`
        SELECT id, name, category_id, status, due_date
        FROM tasks_view
        WHERE status = 'ready'
        ORDER BY due_date ASC NULLS LAST
        LIMIT 5
      `),
    ]);

    return {
      counts: counts.rows[0],
      balanceStatus: balance.rows,
      upNext: upNext.rows,
    };
  }
}
