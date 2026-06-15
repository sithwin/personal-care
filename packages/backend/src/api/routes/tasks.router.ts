import { Router } from 'express';
import type { ITaskQueryService, TaskFilter } from '../../application/ports/ITaskQueryService';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';

export function makeTasksRouter(queryService: ITaskQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const filter: TaskFilter = {
      status: req.query.status as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      sort: req.query.sort as TaskFilter['sort'],
    };
    res.json(await queryService.getAll(filter));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const task = await queryService.getById(req.params.id);
    if (!task) throw new AppError('Task not found', 404);
    res.json(task);
  }));

  return router;
}
