import { Router } from 'express';
import { z } from 'zod';
import type { IItemQueryService, ItemFilter } from '../../application/ports/IItemQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';
import { createItemSchema } from '../validation/item-commands.schema';

export function makeItemsRouter(queryService: IItemQueryService, bus: ICommandBus): Router {
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

  router.post('/', asyncHandler(async (req, res) => {
    const body = createItemSchema.parse(req.body);
    const events = await bus.dispatch(
      { type: 'CreateItemCommand', payload: body },
      { requestId: req.requestId, log: req.log },
    );
    res.status(201).json({ id: events[0].aggregateId });
  }));

  router.post('/:id/available', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'MarkItemAvailableCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/consumed', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'MarkItemConsumedCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/available-again', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'MarkItemAvailableAgainCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  return router;
}
