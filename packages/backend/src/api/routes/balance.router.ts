import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeBalanceRouter(pool: Pool): Router {
  const router = Router();

  router.get('/rules', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM balance_rules_view ORDER BY frequency ASC');
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT bs.*, c.name as category_name, c.icon as category_icon
         FROM balance_status_view bs
         LEFT JOIN categories_view c ON c.id = bs.category_id
         ORDER BY bs.frequency ASC`
      );
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/status/unmet', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT bs.*, c.name as category_name, c.icon as category_icon
         FROM balance_status_view bs
         LEFT JOIN categories_view c ON c.id = bs.category_id
         WHERE bs.is_met = false
         ORDER BY bs.frequency ASC`
      );
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  return router;
}
