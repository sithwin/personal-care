import { Router } from 'express';
import type { IProjectQueryService, ProjectFilter } from '../../application/ports/IProjectQueryService';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';

export function makeProjectsRouter(queryService: IProjectQueryService): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const filter: ProjectFilter = {
      status: req.query.status as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
    };
    res.json(await queryService.getAll(filter));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const project = await queryService.getById(req.params.id);
    if (!project) throw new AppError('Project not found', 404);
    res.json(project);
  }));

  return router;
}
