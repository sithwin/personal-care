import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { IItemQueryService, ItemView } from '../../application/ports/IItemQueryService';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import { makeItemsRouter } from './items.router';
import { errorHandler } from '../middleware/error-handler';
import { requestContextMiddleware } from '../middleware/request-context';

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
  let bus: ICommandBus;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    queryService = { getAll: vi.fn(), getById: vi.fn() };
    bus = { dispatch: vi.fn().mockResolvedValue([{
      id: 1, aggregateId: 'new-uuid', aggregateType: 'item',
      eventType: 'ItemCreated', payload: {}, version: 1, createdAt: new Date(),
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
    app.use('/items', makeItemsRouter(queryService, bus));
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

  it('POST / creates an item and returns 201 with id', async () => {
    const res = await fetch(`${baseUrl}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Shampoo', categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'new-uuid' });
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'CreateItemCommand', payload: { name: 'Shampoo', categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST / returns 400 for invalid body', async () => {
    const res = await fetch(`${baseUrl}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    expect(bus.dispatch).not.toHaveBeenCalled();
  });

  it('POST /:id/available marks item available and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/items/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/available`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'MarkItemAvailableCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST /:id/consumed marks item consumed and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/items/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumed`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'MarkItemConsumedCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST /:id/available-again marks item available again and returns 204', async () => {
    vi.mocked(bus.dispatch).mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/items/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/available-again`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(bus.dispatch).toHaveBeenCalledWith(
      { type: 'MarkItemAvailableAgainCommand', payload: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } },
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('POST /:id/available returns 400 for invalid UUID', async () => {
    const res = await fetch(`${baseUrl}/items/not-a-uuid/available`, { method: 'POST' });
    expect(res.status).toBe(400);
  });
});
