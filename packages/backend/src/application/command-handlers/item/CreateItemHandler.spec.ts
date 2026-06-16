import { describe, it, expect, vi } from 'vitest';
import { CreateItemHandler } from './CreateItemHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateItemCommand } from '../../../domain/item/commands/CreateItemCommand';
import type { StoredEvent } from '../../../types';
import { Item } from '../../../domain/item/Item';

describe('CreateItemHandler', () => {
  it('appends the event from Item.create with expectedVersion 0', async () => {
    const cmd: CreateItemCommand = {
      type: 'CreateItemCommand',
      payload: {
        id: 'item-1',
        name: 'Shampoo',
        categoryId: 'cat-1',
        description: 'Hair shampoo',
        quantity: 1,
        price: 9.99,
        notes: 'Gentle formula',
      },
    };

    const event = Item.create(cmd);
    const mockStoredEvents: StoredEvent[] = [
      {
        id: 1,
        aggregateId: 'item-1',
        aggregateType: 'item',
        eventType: 'ItemCreated',
        payload: cmd.payload,
        version: 1,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn(),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateItemHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.append).toHaveBeenCalledWith([event], 0);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateItemCommand = {
      type: 'CreateItemCommand',
      payload: {
        id: 'item-2',
        name: 'Toothbrush',
        categoryId: 'cat-1',
      },
    };

    const customStoredEvents: StoredEvent[] = [
      {
        id: 42,
        aggregateId: 'item-2',
        aggregateType: 'item',
        eventType: 'ItemCreated',
        payload: cmd.payload,
        version: 1,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn(),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateItemHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(42);
  });
});
