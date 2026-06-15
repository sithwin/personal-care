import { Router, Request, Response, NextFunction } from 'express';
import type { ICategoryQueryService } from '../../application/ports/ICategoryQueryService';

export function makeCategoriesRouter(queryService: ICategoryQueryService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await queryService.getAll());
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await queryService.getById(req.params.id);
      if (!category) { res.status(404).json({ error: 'Category not found' }); return; }
      res.json(category);
    } catch (err) { next(err); }
  });

  return router;
}
