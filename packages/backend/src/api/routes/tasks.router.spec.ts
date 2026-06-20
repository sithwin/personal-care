import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ITaskQueryService, TaskView } from '../../application/ports/ITaskQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { makeTasksRouter } from './tasks.router';
import { errorHandler } from '../middleware/error-handler';
import { requestContextMiddleware } from '../middleware/request-context';

function makeTaskView(overrides: Partial<TaskView> = {}): TaskView {
  return {
    id: 'task-1',
    name: 'Buy milk',
    description: null,
    category_id: 'cat-1',
    project_id: null,
    status: 'ready',
    estimated_duration_value: null,
    estimated_duration_unit: null,
    due_date: null,
    scheduled_date: null,
    scheduled_start_time: null,
    recurrence_rule: null,
    next_due_date: null,
    completion_count: 0,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    required_items: null,
    resources: null,
    ...overrides,
  };
}

describe('tasks router', () => {
  let queryService: ITaskQueryService;
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };
    bus = { dispatch: vi.fn().mockResolvedValue([{
      id: 1, aggregateId: 'new-uuid', aggregateType: 'task',
      eventType: 'TaskCreated', payload: {}, version: 1, createdAt: new Date(),
    }]) } as unknown as ICommandBus;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { log: { child: () => unknown } }).log = {
        child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) }),
      };
      next();
    });
    app.use(requestContextMiddleware);
    app.use('/tasks', makeTasksRouter(queryService, bus));
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('expected AddressInfo');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('passes query params through as a filter and returns the matching tasks', async () => {
    const tasks = [makeTaskView()];
    vi.mocked(queryService.getAll).mockResolvedValue(tasks);

    const res = await fetch(`${baseUrl}/tasks?status=ready&categoryId=cat-1&sort=dueDate`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ status: 'ready', categoryId: 'cat-1', sort: 'dueDate' });
    expect(res.status).toBe(200);
    expect(body).toEqual(tasks);
  });

  it('returns all tasks with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/tasks`);

    expect(queryService.getAll).toHaveBeenCalledWith({ status: undefined, categoryId: undefined, sort: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the task by id when found', async () => {
    const task = makeTaskView({ id: 'task-2' });
    vi.mocked(queryService.getById).mockResolvedValue(task);

    const res = await fetch(`${baseUrl}/tasks/task-2`);

    expect(queryService.getById).toHaveBeenCalledWith('task-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(task);
  });

  it('returns 404 when the task is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/tasks/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Task not found' });
  });

  it('POST / creates a task and returns 201 with id', async () => {
    const res = await fetch(`${baseUrl}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Oil change', categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'new-uuid' });
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CreateTaskCommand', payload: { name: 'Oil change', categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await fetch(`${baseUrl}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('PATCH /:id updates a task and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/tasks/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated oil change' }),
    });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'UpdateTaskCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Updated oil change' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST /:id/start starts a task and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/tasks/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/start`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'StartTaskCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('PATCH /:id returns 400 for invalid UUID', async () => {
    const res = await fetch(`${baseUrl}/tasks/not-a-uuid`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });
});
