import { Router } from 'express';
import type { IDashboardQueryService } from '../../application/ports/IDashboardQueryService';
import { asyncHandler } from '../utils/async-handler';

export function makeDashboardRouter(queryService: IDashboardQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (_req, res) => {
    res.json(await queryService.get());
  }));

  return router;
}
