import { Router } from 'express';
import type { ICategoryQueryService } from '../../application/ports/ICategoryQueryService';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';

export function makeCategoriesRouter(queryService: ICategoryQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (_req, res) => {
    res.json(await queryService.getAll());
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const category = await queryService.getById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);
    res.json(category);
  }));

  return router;
}
