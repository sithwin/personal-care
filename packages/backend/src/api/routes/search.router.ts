import { Router } from 'express';
import type { ISearchQueryService } from '../../application/ports/ISearchQueryService';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';

export function makeSearchRouter(queryService: ISearchQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const q = req.query.q as string | undefined;
    if (!q || q.trim().length < 2) throw new AppError('Query must be at least 2 characters', 400);
    res.json(await queryService.search(q.trim()));
  }));

  return router;
}
