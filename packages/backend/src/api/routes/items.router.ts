import { Router } from 'express';
import type { IItemQueryService, ItemFilter } from '../../application/ports/IItemQueryService';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';

export function makeItemsRouter(queryService: IItemQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const filter: ItemFilter = {
      status: req.query.status as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
    };
    res.json(await queryService.getAll(filter));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const item = await queryService.getById(req.params.id);
    if (!item) throw new AppError('Item not found', 404);
    res.json(item);
  }));

  return router;
}
