import { Router, Request, Response, NextFunction } from 'express';
import type { ITaskQueryService, TaskFilter } from '../../application/ports/ITaskQueryService';

export function makeTasksRouter(queryService: ITaskQueryService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: TaskFilter = {
        status: req.query.status as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        sort: req.query.sort as TaskFilter['sort'],
      };
      res.json(await queryService.getAll(filter));
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await queryService.getById(req.params.id);
      if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
      res.json(task);
    } catch (err) { next(err); }
  });

  return router;
}
