import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IProjectQueryService, ProjectView } from '../../application/ports/IProjectQueryService';
import { makeProjectsRouter } from './projects.router';
import { errorHandler } from '../middleware/error-handler';

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
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/projects', makeProjectsRouter(queryService));
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
});
