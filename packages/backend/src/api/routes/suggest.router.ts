import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeSuggestRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = parseFloat((req.query.hours as string) ?? '0');
      const categoryId = req.query.categoryId as string | undefined;

      const unmetRes = await pool.query('SELECT category_id FROM balance_status_view WHERE is_met = false');
      const priorityCategoryIds = new Set(unmetRes.rows.map((r: { category_id: string }) => r.category_id));

      const conditions = [`status = 'ready'`];
      const params: unknown[] = [];

      if (hours > 0) {
        conditions.push(`(estimated_duration_value IS NULL OR (estimated_duration_unit = 'hour' AND estimated_duration_value <= $${params.length + 1}) OR (estimated_duration_unit = 'day' AND estimated_duration_value * 8 <= $${params.length + 1}))`);
        params.push(hours);
      }
      if (categoryId) {
        conditions.push(`category_id = $${params.length + 1}`);
        params.push(categoryId);
      }

      const result = await pool.query(
        `SELECT * FROM tasks_view WHERE ${conditions.join(' AND ')} ORDER BY due_date ASC NULLS LAST`,
        params
      );

      const tasks = result.rows.sort((a: { category_id: string; due_date: string | null }, b: { category_id: string; due_date: string | null }) => {
        const aPriority = priorityCategoryIds.has(a.category_id) ? 0 : 1;
        const bPriority = priorityCategoryIds.has(b.category_id) ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      res.json(tasks);
    } catch (err) { next(err); }
  });

  return router;
}
