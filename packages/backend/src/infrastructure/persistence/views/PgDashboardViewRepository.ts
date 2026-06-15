import type { Pool } from 'pg';
import type { IDashboardViewRepository } from '../../../application/ports/IDashboardViewRepository';

export class PgDashboardViewRepository implements IDashboardViewRepository {
  constructor(private readonly pool: Pool) {}

  async refresh(): Promise<void> {
    await this.pool.query(`
      UPDATE dashboard_view SET
        ready_count   = (SELECT COUNT(*) FROM tasks_view WHERE status = 'ready'),
        ongoing_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'ongoing'),
        pending_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'pending'),
        planned_count = (SELECT COUNT(*) FROM tasks_view WHERE status = 'planned'),
        to_buy_count  = (SELECT COUNT(*) FROM items_view WHERE status = 'to_buy'),
        updated_at    = NOW()
      WHERE id = 1
    `);
  }
}
