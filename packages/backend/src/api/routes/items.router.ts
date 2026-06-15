import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeItemsRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, categoryId } = req.query as Record<string, string>;
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
      if (categoryId) { conditions.push(`category_id = $${params.length + 1}`); params.push(categoryId); }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(`SELECT * FROM items_view ${where} ORDER BY name ASC`, params);
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM items_view WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: 'Item not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
