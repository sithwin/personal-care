import { describe, it, expect, vi } from 'vitest';
import { CreateCategoryHandler } from './CreateCategoryHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateCategoryCommand } from '../../../domain/category/commands/CreateCategoryCommand';
import type { StoredEvent } from '../../../types';
import { Category } from '../../../domain/category/Category';

describe('CreateCategoryHandler', () => {
  it('appends the event from Category.create with expectedVersion 0', async () => {
    const cmd: CreateCategoryCommand = {
      type: 'CreateCategoryCommand',
      payload: {
        id: 'cat-1',
        name: 'Home',
        icon: '🏠',
        color: '#22c55e',
        isDefault: false,
      },
    };

    const event = Category.create(cmd);
    const mockStoredEvents: StoredEvent[] = [
      {
        id: 1,
        aggregateId: 'cat-1',
        aggregateType: 'category',
        eventType: 'CategoryCreated',
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

    const handler = new CreateCategoryHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.append).toHaveBeenCalledWith([event], 0);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateCategoryCommand = {
      type: 'CreateCategoryCommand',
      payload: {
        id: 'cat-2',
        name: 'Health',
        icon: '💪',
        color: '#ef4444',
        isDefault: true,
      },
    };

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'cat-2',
        aggregateType: 'category',
        eventType: 'CategoryCreated',
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

    const handler = new CreateCategoryHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
