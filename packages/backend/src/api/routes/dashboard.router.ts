import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeDashboardRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [dashboard, balance, upNext] = await Promise.all([
        pool.query('SELECT * FROM dashboard_view WHERE id = 1'),
        pool.query(`SELECT bs.*, c.name as category_name, c.icon as category_icon
                    FROM balance_status_view bs
                    LEFT JOIN categories_view c ON c.id = bs.category_id`),
        pool.query(`SELECT * FROM tasks_view WHERE status = 'ready'
                    ORDER BY due_date ASC NULLS LAST LIMIT 5`),
      ]);
      res.json({
        counts: dashboard.rows[0],
        balanceStatus: balance.rows,
        upNext: upNext.rows,
      });
    } catch (err) { next(err); }
  });

  return router;
}
