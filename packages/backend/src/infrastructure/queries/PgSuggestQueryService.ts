import { Pool } from 'pg';
import type { ISuggestQueryService, SuggestFilter, SuggestedTaskView } from '../../application/ports/ISuggestQueryService';

export class PgSuggestQueryService implements ISuggestQueryService {
  constructor(private readonly pool: Pool) {}

  async suggest(filter: SuggestFilter): Promise<SuggestedTaskView[]> {
    const unmetRes = await this.pool.query(
      'SELECT category_id FROM balance_status_view WHERE is_met = false',
    );
    const priorityCategoryIds = new Set<string>(unmetRes.rows.map((r: { category_id: string }) => r.category_id));

    const conditions = [`status = 'ready'`];
    const params: unknown[] = [];

    if (filter.hours && filter.hours > 0) {
      conditions.push(
        `(estimated_duration_value IS NULL` +
        ` OR (estimated_duration_unit = 'hour' AND estimated_duration_value <= $${params.length + 1})` +
        ` OR (estimated_duration_unit = 'day' AND estimated_duration_value * 8 <= $${params.length + 1}))`,
      );
      params.push(filter.hours);
    }
    if (filter.categoryId) {
      conditions.push(`category_id = $${params.length + 1}`);
      params.push(filter.categoryId);
    }

    const result = await this.pool.query(
      `SELECT id, name, category_id, status, due_date, estimated_duration_value, estimated_duration_unit
       FROM tasks_view
       WHERE ${conditions.join(' AND ')}
       ORDER BY due_date ASC NULLS LAST`,
      params,
    );

    return result.rows.sort((a: SuggestedTaskView, b: SuggestedTaskView) => {
      const aPriority = priorityCategoryIds.has(a.category_id) ? 0 : 1;
      const bPriority = priorityCategoryIds.has(b.category_id) ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }
}
