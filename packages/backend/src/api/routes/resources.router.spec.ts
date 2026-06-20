import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IResourceQueryService, ResourceView } from '../../application/ports/IResourceQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { makeResourcesRouter } from './resources.router';
import { errorHandler } from '../middleware/error-handler';
import { requestContextMiddleware } from '../middleware/request-context';

function makeResourceView(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'res-1',
    title: 'Doctor article',
    type: 'link',
    url: 'https://example.com',
    notes: null,
    category_id: 'cat-1',
    task_ids: [],
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('resources router', () => {
  let queryService: IResourceQueryService;
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };
    bus = { dispatch: vi.fn().mockResolvedValue([{
      id: 1, aggregateId: 'new-uuid', aggregateType: 'resource',
      eventType: 'ResourceCreated', payload: {}, version: 1, createdAt: new Date(),
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
    app.use('/resources', makeResourcesRouter(queryService, bus));
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

  it('passes query params through as a filter and returns the matching resources', async () => {
    const resources = [makeResourceView()];
    vi.mocked(queryService.getAll).mockResolvedValue(resources);

    const res = await fetch(`${baseUrl}/resources?type=link&categoryId=cat-1&q=doctor`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ type: 'link', categoryId: 'cat-1', q: 'doctor' });
    expect(res.status).toBe(200);
    expect(body).toEqual(resources);
  });

  it('returns all resources with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/resources`);

    expect(queryService.getAll).toHaveBeenCalledWith({ type: undefined, categoryId: undefined, q: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the resource by id when found', async () => {
    const resource = makeResourceView({ id: 'res-2' });
    vi.mocked(queryService.getById).mockResolvedValue(resource);

    const res = await fetch(`${baseUrl}/resources/res-2`);

    expect(queryService.getById).toHaveBeenCalledWith('res-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(resource);
  });

  it('returns 404 when the resource is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/resources/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Resource not found' });
  });

  it('POST / creates a resource and returns 201 with id', async () => {
    const res = await fetch(`${baseUrl}/resources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'GTD Book', type: 'link', url: 'https://example.com' }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'new-uuid' });
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CreateResourceCommand', payload: { title: 'GTD Book', type: 'link', url: 'https://example.com' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await fetch(`${baseUrl}/resources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('PATCH /:id updates a resource and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/resources/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'UpdateResourceCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Updated Title' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('DELETE /:id deletes a resource and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/resources/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, { method: 'DELETE' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'DeleteResourceCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('PATCH /:id returns 400 for invalid UUID', async () => {
    const res = await fetch(`${baseUrl}/resources/not-a-uuid`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    });
    expect(res.status).toBe(400);
  });
});
