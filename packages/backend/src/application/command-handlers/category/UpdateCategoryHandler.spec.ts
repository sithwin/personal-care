import { describe, it, expect, vi } from 'vitest';
import { UpdateCategoryHandler } from './UpdateCategoryHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { UpdateCategoryCommand } from '../../../domain/category/commands/UpdateCategoryCommand';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'cat-1',
    aggregateType: 'category',
    eventType: 'CategoryCreated',
    payload: { id: 'cat-1', name: 'Home', icon: '🏠', color: '#22c55e', isDefault: false },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('UpdateCategoryHandler', () => {
  it('throws Category not found when getEvents resolves empty history', async () => {
    const cmd: UpdateCategoryCommand = {
      type: 'UpdateCategoryCommand',
      payload: {
        id: 'cat-1',
        name: 'Garden',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new UpdateCategoryHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Category not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.update with expectedVersion equal to history.length', async () => {
    const cmd: UpdateCategoryCommand = {
      type: 'UpdateCategoryCommand',
      payload: {
        id: 'cat-1',
        name: 'Garden',
      },
    };

    const history = [makeCreatedEvent()];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'cat-1',
        aggregateType: 'category',
        eventType: 'CategoryUpdated',
        payload: { id: 'cat-1', name: 'Garden' },
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new UpdateCategoryHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('cat-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('CategoryUpdated');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: UpdateCategoryCommand = {
      type: 'UpdateCategoryCommand',
      payload: {
        id: 'cat-2',
        icon: '🌳',
        color: '#10b981',
      },
    };

    const history = [makeCreatedEvent({
      aggregateId: 'cat-2',
      payload: {
        id: 'cat-2',
        name: 'Outdoor',
        icon: '🏕️',
        color: '#22c55e',
        isDefault: false,
      } as unknown,
    })];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'cat-2',
        aggregateType: 'category',
        eventType: 'CategoryUpdated',
        payload: { id: 'cat-2', icon: '🌳', color: '#10b981' },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new UpdateCategoryHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
