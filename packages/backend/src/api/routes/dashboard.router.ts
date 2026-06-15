import { Router, Request, Response, NextFunction } from 'express';
import type { IDashboardQueryService } from '../../application/ports/IDashboardQueryService';

export function makeDashboardRouter(queryService: IDashboardQueryService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await queryService.get());
    } catch (err) { next(err); }
  });

  return router;
}
