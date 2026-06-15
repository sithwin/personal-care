import { Pool } from 'pg';
import type { IBalanceQueryService, BalanceRuleView, BalanceStatusView } from '../../application/ports/IBalanceQueryService';

const STATUS_SQL = `
  SELECT bs.*, c.name as category_name, c.icon as category_icon
  FROM balance_status_view bs
  LEFT JOIN categories_view c ON c.id = bs.category_id
  ORDER BY bs.frequency ASC
`;

export class PgBalanceQueryService implements IBalanceQueryService {
  constructor(private readonly pool: Pool) {}

  async getRules(): Promise<BalanceRuleView[]> {
    const result = await this.pool.query('SELECT * FROM balance_rules_view ORDER BY frequency ASC');
    return result.rows;
  }

  async getStatus(): Promise<BalanceStatusView[]> {
    const result = await this.pool.query(STATUS_SQL);
    return result.rows;
  }

  async getUnmetStatus(): Promise<BalanceStatusView[]> {
    const result = await this.pool.query(`${STATUS_SQL.trim().replace('ORDER BY', 'WHERE bs.is_met = false ORDER BY')}`);
    return result.rows;
  }
}
