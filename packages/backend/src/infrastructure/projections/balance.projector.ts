import type { Pool } from 'pg';
import type { Projector } from '../../application/ports/IProjector';

function getPeriodBounds(frequency: string, dayRestriction: string | null): { start: Date; end: Date } | null {
  const now = new Date();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  if (frequency === 'daily') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (frequency === 'weekly') {
    if (dayRestriction === 'weekend' && !isWeekend) return null;
    const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (frequency === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  return null;
}

async function refreshBalanceStatus(pool: Pool): Promise<void> {
  const rules = await pool.query('SELECT * FROM balance_rules_view');
  for (const rule of rules.rows) {
    const bounds = getPeriodBounds(rule.frequency, rule.day_restriction);
    if (!bounds) {
      await pool.query(
        `INSERT INTO balance_status_view (rule_id, category_id, frequency, target_count, actual_count, is_met, period_start, period_end)
         VALUES ($1,$2,$3,$4,0,false,NOW(),NOW())
         ON CONFLICT (rule_id) DO UPDATE SET actual_count=0, is_met=false`,
        [rule.id, rule.category_id, rule.frequency, rule.minimum_count]
      );
      continue;
    }
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM events
       WHERE event_type = 'TaskCompleted'
         AND created_at BETWEEN $1 AND $2
         AND payload->>'id' IN (
           SELECT id::text FROM tasks_view WHERE category_id = $3
         )`,
      [bounds.start, bounds.end, rule.category_id]
    );
    const actual = parseInt(countRes.rows[0].count, 10);
    await pool.query(
      `INSERT INTO balance_status_view (rule_id, category_id, frequency, target_count, actual_count, is_met, period_start, period_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (rule_id) DO UPDATE SET
         actual_count=$5, is_met=$6, period_start=$7, period_end=$8`,
      [rule.id, rule.category_id, rule.frequency, rule.minimum_count, actual, actual >= rule.minimum_count, bounds.start, bounds.end]
    );
  }
}

export function createBalanceProjector(pool: Pool): Projector {
  return async (event) => {
    const p = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'BalanceRuleCreated':
        await pool.query(
          `INSERT INTO balance_rules_view (id, category_id, minimum_count, frequency, day_restriction)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [p.id, p.categoryId, p.minimumCount, p.frequency, p.dayRestriction ?? null]
        );
        await refreshBalanceStatus(pool);
        break;
      case 'BalanceRuleUpdated':
        await pool.query(
          `UPDATE balance_rules_view SET
           minimum_count = COALESCE($1, minimum_count),
           frequency = COALESCE($2, frequency),
           day_restriction = COALESCE($3, day_restriction)
           WHERE id = $4`,
          [p.minimumCount ?? null, p.frequency ?? null, p.dayRestriction ?? null, p.id]
        );
        await refreshBalanceStatus(pool);
        break;
      case 'BalanceRuleDeleted':
        await pool.query('DELETE FROM balance_rules_view WHERE id = $1', [p.id]);
        await pool.query('DELETE FROM balance_status_view WHERE rule_id = $1', [p.id]);
        break;
      case 'TaskCompleted':
        await refreshBalanceStatus(pool);
        break;

      default:
        break;
    }
  };
}
