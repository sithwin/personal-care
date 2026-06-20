import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ICategoryQueryService, CategoryView } from '../../application/ports/ICategoryQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { makeCategoriesRouter } from './categories.router';
import { errorHandler } from '../middleware/error-handler';
import { requestContextMiddleware } from '../middleware/request-context';

function makeCategoryView(overrides: Partial<CategoryView> = {}): CategoryView {
  return {
    id: 'cat-1',
    name: 'Health',
    icon: 'heart',
    color: '#ff0000',
    is_default: false,
    task_count: 0,
    item_count: 0,
    deleted: false,
    ...overrides,
  };
}

describe('categories router', () => {
  let queryService: ICategoryQueryService;
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };
    bus = { dispatch: vi.fn().mockResolvedValue([{
      id: 1, aggregateId: 'new-uuid', aggregateType: 'category',
      eventType: 'CategoryCreated', payload: {}, version: 1, createdAt: new Date(),
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
    app.use('/categories', makeCategoriesRouter(queryService, bus));
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

  it('returns all categories', async () => {
    const categories = [makeCategoryView()];
    vi.mocked(queryService.getAll).mockResolvedValue(categories);

    const res = await fetch(`${baseUrl}/categories`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith();
    expect(res.status).toBe(200);
    expect(body).toEqual(categories);
  });

  it('returns the category by id when found', async () => {
    const category = makeCategoryView({ id: 'cat-2' });
    vi.mocked(queryService.getById).mockResolvedValue(category);

    const res = await fetch(`${baseUrl}/categories/cat-2`);

    expect(queryService.getById).toHaveBeenCalledWith('cat-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(category);
  });

  it('returns 404 when the category is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/categories/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Category not found' });
  });

  it('POST / creates a category and returns 201 with id', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Health', icon: '💪', color: '#ef4444', isDefault: false }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'new-uuid' });
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CreateCategoryCommand', payload: { name: 'Health', icon: '💪', color: '#ef4444', isDefault: false } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('PATCH /:id updates a category and returns 204', async () => {
    const catId = 'a3d5e4b7-5f21-4e5b-b6d0-1a2b3c4d5e6f';
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/categories/${catId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Garden' }),
    });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'UpdateCategoryCommand', payload: { id: catId, name: 'Garden' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('DELETE /:id deletes a category and returns 204', async () => {
    const catId = 'a3d5e4b7-5f21-4e5b-b6d0-1a2b3c4d5e6f';
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/categories/${catId}`, { method: 'DELETE' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'DeleteCategoryCommand', payload: { id: catId } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('PATCH /:id returns 400 for invalid UUID', async () => {
    const res = await fetch(`${baseUrl}/categories/not-a-uuid`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Garden' }),
    });
    expect(res.status).toBe(400);
  });
});
