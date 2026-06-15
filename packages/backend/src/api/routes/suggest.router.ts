import { Router, Request, Response, NextFunction } from 'express';
import type { ISuggestQueryService, SuggestFilter } from '../../application/ports/ISuggestQueryService';

export function makeSuggestRouter(queryService: ISuggestQueryService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: SuggestFilter = {
        hours: req.query.hours ? parseFloat(req.query.hours as string) : undefined,
        categoryId: req.query.categoryId as string | undefined,
      };
      res.json(await queryService.suggest(filter));
    } catch (err) { next(err); }
  });

  return router;
}
