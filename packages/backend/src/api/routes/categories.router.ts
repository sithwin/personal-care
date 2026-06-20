import { Router } from 'express';
import { z } from 'zod';
import type { ICategoryQueryService } from '../../application/ports/ICategoryQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';
import { createCategorySchema, updateCategorySchema } from '../validation/category-commands.schema';

export function makeCategoriesRouter(queryService: ICategoryQueryService, bus: ICommandBus): Router {
  const router = Router();

  router.get('/', asyncHandler(async (_req, res) => {
    res.json(await queryService.getAll());
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const category = await queryService.getById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);
    res.json(category);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const body = createCategorySchema.parse(req.body);
    const events = await bus.dispatch(
      { type: 'CreateCategoryCommand', payload: body },
      { requestId: req.requestId, log: req.log },
    );
    res.status(201).json({ id: events[0].aggregateId });
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateCategorySchema.parse(req.body);
    await bus.dispatch(
      { type: 'UpdateCategoryCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'DeleteCategoryCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  return router;
}
