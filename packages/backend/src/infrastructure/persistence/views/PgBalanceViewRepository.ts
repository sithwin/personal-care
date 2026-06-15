import type { Pool } from 'pg';
import type {
  IBalanceViewRepository,
  BalanceRuleRow,
  InsertBalanceRuleData,
  UpdateBalanceRuleData,
  UpsertBalanceStatusData,
} from '../../../application/ports/IBalanceViewRepository';

export class PgBalanceViewRepository implements IBalanceViewRepository {
  constructor(private readonly pool: Pool) {}

  async insertRule(data: InsertBalanceRuleData): Promise<void> {
    await this.pool.query(
      `INSERT INTO balance_rules_view (id, category_id, minimum_count, frequency, day_restriction)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [data.id, data.categoryId, data.minimumCount, data.frequency, data.dayRestriction]
    );
  }

  async updateRule(id: string, data: UpdateBalanceRuleData): Promise<void> {
    await this.pool.query(
      `UPDATE balance_rules_view SET
       minimum_count = COALESCE($1, minimum_count),
       frequency = COALESCE($2, frequency),
       day_restriction = COALESCE($3, day_restriction)
       WHERE id = $4`,
      [data.minimumCount, data.frequency, data.dayRestriction, id]
    );
  }

  async deleteRule(id: string): Promise<void> {
    await this.pool.query('DELETE FROM balance_rules_view WHERE id = $1', [id]);
  }

  async deleteStatusForRule(ruleId: string): Promise<void> {
    await this.pool.query('DELETE FROM balance_status_view WHERE rule_id = $1', [ruleId]);
  }

  async getAllRules(): Promise<BalanceRuleRow[]> {
    const res = await this.pool.query('SELECT * FROM balance_rules_view');
    return res.rows.map((r) => ({
      id: r.id as string,
      categoryId: r.category_id as string,
      frequency: r.frequency as string,
      minimumCount: r.minimum_count as number,
      dayRestriction: r.day_restriction as string | null,
    }));
  }

  async countCompletedTasksInPeriod(categoryId: string, start: Date, end: Date): Promise<number> {
    const res = await this.pool.query(
      `SELECT COUNT(*) FROM events
       WHERE event_type = 'TaskCompleted'
         AND created_at BETWEEN $1 AND $2
         AND payload->>'id' IN (
           SELECT id::text FROM tasks_view WHERE category_id = $3
         )`,
      [start, end, categoryId]
    );
    return parseInt(res.rows[0].count as string, 10);
  }

  async upsertStatus(data: UpsertBalanceStatusData): Promise<void> {
    await this.pool.query(
      `INSERT INTO balance_status_view
         (rule_id, category_id, frequency, target_count, actual_count, is_met, period_start, period_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (rule_id) DO UPDATE SET
         actual_count = $5, is_met = $6, period_start = $7, period_end = $8`,
      [data.ruleId, data.categoryId, data.frequency, data.targetCount,
       data.actualCount, data.isMet, data.periodStart, data.periodEnd]
    );
  }
}
