import { Router, Request, Response, NextFunction } from 'express';
import type { IResourceQueryService, ResourceFilter } from '../../application/ports/IResourceQueryService';

export function makeResourcesRouter(queryService: IResourceQueryService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: ResourceFilter = {
        type: req.query.type as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        q: req.query.q as string | undefined,
      };
      res.json(await queryService.getAll(filter));
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resource = await queryService.getById(req.params.id);
      if (!resource) { res.status(404).json({ error: 'Resource not found' }); return; }
      res.json(resource);
    } catch (err) { next(err); }
  });

  return router;
}
