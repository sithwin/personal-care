import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IProjectQueryService, ProjectView } from '../../application/ports/IProjectQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { makeProjectsRouter } from './projects.router';
import { errorHandler } from '../middleware/error-handler';
import { requestContextMiddleware } from '../middleware/request-context';

function makeProjectView(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 'proj-1',
    name: 'Renovate kitchen',
    description: null,
    category_id: 'cat-1',
    status: 'active',
    due_date: null,
    task_ids: [],
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('projects router', () => {
  let queryService: IProjectQueryService;
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };
    bus = { dispatch: vi.fn().mockResolvedValue([{
      id: 1, aggregateId: 'new-uuid', aggregateType: 'project',
      eventType: 'ProjectCreated', payload: {}, version: 1, createdAt: new Date(),
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
    app.use('/projects', makeProjectsRouter(queryService, bus));
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

  it('passes query params through as a filter and returns the matching projects', async () => {
    const projects = [makeProjectView()];
    vi.mocked(queryService.getAll).mockResolvedValue(projects);

    const res = await fetch(`${baseUrl}/projects?status=active&categoryId=cat-1`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ status: 'active', categoryId: 'cat-1' });
    expect(res.status).toBe(200);
    expect(body).toEqual(projects);
  });

  it('returns all projects with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/projects`);

    expect(queryService.getAll).toHaveBeenCalledWith({ status: undefined, categoryId: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the project by id when found', async () => {
    const project = makeProjectView({ id: 'proj-2' });
    vi.mocked(queryService.getById).mockResolvedValue(project);

    const res = await fetch(`${baseUrl}/projects/proj-2`);

    expect(queryService.getById).toHaveBeenCalledWith('proj-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(project);
  });

  it('returns 404 when the project is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/projects/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Project not found' });
  });

  it('POST / creates a project and returns 201 with id', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Home Reno', categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'new-uuid' });
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CreateProjectCommand', payload: { name: 'Home Reno', categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('PATCH /:id updates a project and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/projects/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Garden Overhaul' }),
    });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'UpdateProjectCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Garden Overhaul' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST /:id/complete completes a project and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/projects/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/complete`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CompleteProjectCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('PATCH /:id returns 400 for invalid UUID', async () => {
    const res = await fetch(`${baseUrl}/projects/not-a-uuid`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    expect(res.status).toBe(400);
  });
});
