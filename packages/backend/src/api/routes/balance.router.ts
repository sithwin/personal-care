import { Router, Request, Response, NextFunction } from 'express';
import type { IBalanceQueryService } from '../../application/ports/IBalanceQueryService';

export function makeBalanceRouter(queryService: IBalanceQueryService): Router {
  const router = Router();

  router.get('/rules', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await queryService.getRules());
    } catch (err) { next(err); }
  });

  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await queryService.getStatus());
    } catch (err) { next(err); }
  });

  router.get('/status/unmet', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await queryService.getUnmetStatus());
    } catch (err) { next(err); }
  });

  return router;
}
