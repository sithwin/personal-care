import { Router } from 'express';
import { z } from 'zod';
import type { IResourceQueryService, ResourceFilter } from '../../application/ports/IResourceQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';
import { createResourceSchema, updateResourceSchema } from '../validation/resource-commands.schema';

export function makeResourcesRouter(queryService: IResourceQueryService, bus: ICommandBus): Router {
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

  router.post('/', asyncHandler(async (req, res) => {
    const body = createResourceSchema.parse(req.body);
    const events = await bus.dispatch(
      { type: 'CreateResourceCommand', payload: body },
      { requestId: req.requestId, log: req.log },
    );
    res.status(201).json({ id: events[0].aggregateId });
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateResourceSchema.parse(req.body);
    await bus.dispatch(
      { type: 'UpdateResourceCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'DeleteResourceCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  return router;
}
