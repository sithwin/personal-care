import { Router } from 'express';
import type { ISuggestQueryService, SuggestFilter } from '../../application/ports/ISuggestQueryService';
import { asyncHandler } from '../utils/async-handler';

export function makeSuggestRouter(queryService: ISuggestQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const filter: SuggestFilter = {
      hours: req.query.hours ? parseFloat(req.query.hours as string) : undefined,
      categoryId: req.query.categoryId as string | undefined,
    };
    res.json(await queryService.suggest(filter));
  }));

  return router;
}
