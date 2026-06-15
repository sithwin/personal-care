import { Router, Request, Response, NextFunction } from 'express';
import type { IProjectQueryService, ProjectFilter } from '../../application/ports/IProjectQueryService';

export function makeProjectsRouter(queryService: IProjectQueryService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: ProjectFilter = {
        status: req.query.status as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
      };
      res.json(await queryService.getAll(filter));
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await queryService.getById(req.params.id);
      if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
      res.json(project);
    } catch (err) { next(err); }
  });

  return router;
}
