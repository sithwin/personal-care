import { Router, Request, Response, NextFunction } from 'express';
import type { IItemQueryService, ItemFilter } from '../../application/ports/IItemQueryService';

export function makeItemsRouter(queryService: IItemQueryService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: ItemFilter = {
        status: req.query.status as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
      };
      res.json(await queryService.getAll(filter));
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await queryService.getById(req.params.id);
      if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
      res.json(item);
    } catch (err) { next(err); }
  });

  return router;
}
