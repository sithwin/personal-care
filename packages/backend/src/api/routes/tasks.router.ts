import { Router } from 'express';
import { z } from 'zod';
import type { ITaskQueryService, TaskFilter } from '../../application/ports/ITaskQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { AppError } from '../errors/app-error';
import { asyncHandler } from '../utils/async-handler';
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  addItemRequirementSchema,
  setTaskRecurrenceSchema,
  scheduleTaskSchema,
  promoteToProjectSchema,
} from '../validation/task-commands.schema';

export function makeTasksRouter(queryService: ITaskQueryService, bus: ICommandBus): Router {
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

  router.post('/', asyncHandler(async (req, res) => {
    const body = createTaskSchema.parse(req.body);
    const events = await bus.dispatch(
      { type: 'CreateTaskCommand', payload: body },
      { requestId: req.requestId, log: req.log },
    );
    res.status(201).json({ id: events[0].aggregateId });
  }));

  router.patch('/:id', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = updateTaskSchema.parse(req.body);
    await bus.dispatch(
      { type: 'UpdateTaskCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/start', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'StartTaskCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/complete', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = completeTaskSchema.parse({ id, ...req.body });
    await bus.dispatch(
      { type: 'CompleteTaskCommand', payload: body },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/schedule', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = scheduleTaskSchema.parse(req.body);
    await bus.dispatch(
      { type: 'ScheduleTaskCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/recurrence', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const body = setTaskRecurrenceSchema.parse(req.body);
    await bus.dispatch(
      { type: 'SetTaskRecurrenceCommand', payload: { id, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/recurrence/skip', asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await bus.dispatch(
      { type: 'SkipRecurrenceCommand', payload: { id } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/promote', asyncHandler(async (req, res) => {
    const taskId = z.string().uuid().parse(req.params.id);
    const body = promoteToProjectSchema.parse(req.body);
    await bus.dispatch(
      { type: 'PromoteToProjectCommand', payload: { taskId, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/items/:itemId', asyncHandler(async (req, res) => {
    const taskId = z.string().uuid().parse(req.params.id);
    const itemId = z.string().uuid().parse(req.params.itemId);
    const body = addItemRequirementSchema.parse(req.body);
    await bus.dispatch(
      { type: 'AddItemRequirementCommand', payload: { taskId, itemId, ...body } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.delete('/:id/items/:itemId', asyncHandler(async (req, res) => {
    const taskId = z.string().uuid().parse(req.params.id);
    const itemId = z.string().uuid().parse(req.params.itemId);
    await bus.dispatch(
      { type: 'RemoveItemRequirementCommand', payload: { taskId, itemId } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.post('/:id/resources/:resourceId', asyncHandler(async (req, res) => {
    const taskId = z.string().uuid().parse(req.params.id);
    const resourceId = z.string().uuid().parse(req.params.resourceId);
    await bus.dispatch(
      { type: 'AttachResourceToTaskCommand', payload: { taskId, resourceId } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  router.delete('/:id/resources/:resourceId', asyncHandler(async (req, res) => {
    const taskId = z.string().uuid().parse(req.params.id);
    const resourceId = z.string().uuid().parse(req.params.resourceId);
    await bus.dispatch(
      { type: 'DetachResourceFromTaskCommand', payload: { taskId, resourceId } },
      { requestId: req.requestId, log: req.log },
    );
    res.status(204).send();
  }));

  return router;
}
