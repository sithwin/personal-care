import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

export function makeCategoriesRouter(pool: Pool): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM categories_view WHERE deleted = false ORDER BY name ASC');
      res.json(result.rows);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query('SELECT * FROM categories_view WHERE id = $1 AND deleted = false', [req.params.id]);
      if (result.rows.length === 0) { res.status(404).json({ error: 'Category not found' }); return; }
      res.json(result.rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
