import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IItemQueryService, ItemView } from '../../application/ports/IItemQueryService';
import { makeItemsRouter } from './items.router';
import { errorHandler } from '../middleware/error-handler';

function makeItemView(overrides: Partial<ItemView> = {}): ItemView {
  return {
    id: 'item-1',
    name: 'Milk',
    description: null,
    category_id: 'cat-1',
    status: 'to_buy',
    quantity: 1,
    price: null,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('items router', () => {
  let queryService: IItemQueryService;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };

    const app = express();
    app.use(express.json());
    app.use('/items', makeItemsRouter(queryService));
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

  it('passes query params through as a filter and returns the matching items', async () => {
    const items = [makeItemView()];
    vi.mocked(queryService.getAll).mockResolvedValue(items);

    const res = await fetch(`${baseUrl}/items?status=to_buy&categoryId=cat-1`);
    const body = await res.json();

    expect(queryService.getAll).toHaveBeenCalledWith({ status: 'to_buy', categoryId: 'cat-1' });
    expect(res.status).toBe(200);
    expect(body).toEqual(items);
  });

  it('returns all items with an empty filter when no query params are given', async () => {
    vi.mocked(queryService.getAll).mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/items`);

    expect(queryService.getAll).toHaveBeenCalledWith({ status: undefined, categoryId: undefined });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns the item by id when found', async () => {
    const item = makeItemView({ id: 'item-2' });
    vi.mocked(queryService.getById).mockResolvedValue(item);

    const res = await fetch(`${baseUrl}/items/item-2`);

    expect(queryService.getById).toHaveBeenCalledWith('item-2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(item);
  });

  it('returns 404 when the item is not found', async () => {
    vi.mocked(queryService.getById).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/items/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, message: 'Item not found' });
  });
});
