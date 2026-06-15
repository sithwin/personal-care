import { Router } from 'express';
import type { IBalanceQueryService } from '../../application/ports/IBalanceQueryService';
import { asyncHandler } from '../utils/async-handler';

export function makeBalanceRouter(queryService: IBalanceQueryService): Router {
  const router = Router();

  router.get('/rules', asyncHandler(async (_req, res) => {
    res.json(await queryService.getRules());
  }));

  router.get('/status', asyncHandler(async (_req, res) => {
    res.json(await queryService.getStatus());
  }));

  router.get('/status/unmet', asyncHandler(async (_req, res) => {
    res.json(await queryService.getUnmetStatus());
  }));

  return router;
}
