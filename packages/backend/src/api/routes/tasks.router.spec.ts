import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ITaskQueryService, TaskView } from '../../application/ports/ITaskQueryService';
import { makeTasksRouter } from './tasks.router';
import { errorHandler } from '../middleware/error-handler';

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
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/tasks', makeTasksRouter(queryService));
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
});
