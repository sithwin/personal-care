import { Router } from 'express';
import type { IResourceQueryService, ResourceFilter } from '../../application/ports/IResourceQueryService';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';

export function makeResourcesRouter(queryService: IResourceQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const filter: ResourceFilter = {
      type: req.query.type as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      q: req.query.q as string | undefined,
    };
    res.json(await queryService.getAll(filter));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const resource = await queryService.getById(req.params.id);
    if (!resource) throw new AppError('Resource not found', 404);
    res.json(resource);
  }));

  return router;
}
