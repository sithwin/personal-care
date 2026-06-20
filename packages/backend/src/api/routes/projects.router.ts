import { Router } from 'express';
import { z } from 'zod';
import type { IProjectQueryService, ProjectFilter } from '../../application/ports/IProjectQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';
import {
  createProjectSchema,
  updateProjectSchema,
  planProjectSchema,
  startProjectSchema,
} from '../validation/project-commands.schema';

export function makeProjectsRouter(queryService: IProjectQueryService, bus: ICommandBus): Router {
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

  router.post('/', asyncHandler(async (req, res) => {
    const body = createProjectSchema.parse(req.body);
    const events = await bus.dispatch(
      { type: 'CreateProjectCommand', payload: body },
      { requestId: req.requestId, log: req.log },
    );
    res.status(201).json({ id: events[0].aggregateId });
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateProjectSchema.parse(req.body);
    await bus.dispatch(
      { type: 'UpdateProjectCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/complete', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'CompleteProjectCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/plan', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = planProjectSchema.parse(req.body);
    await bus.dispatch(
      { type: 'PlanProjectCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/start', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = startProjectSchema.parse(req.body);
    await bus.dispatch(
      { type: 'StartProjectCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/pause', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'PauseProjectCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/resume', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'ResumeProjectCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/tasks/:taskId', asyncHandler(async (req, res) => {
    const projectId = z.string().uuid().parse(req.params.id);
    const taskId = z.string().uuid().parse(req.params.taskId);
    await bus.dispatch(
      { type: 'AddTaskToProjectCommand', payload: { projectId, taskId } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  return router;
}
