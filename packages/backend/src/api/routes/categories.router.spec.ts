import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { ICategoryQueryService, CategoryView } from '../../application/ports/ICategoryQueryService';
import { makeCategoriesRouter } from './categories.router';
import { errorHandler } from '../middleware/error-handler';

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
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/categories', makeCategoriesRouter(queryService));
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
});
