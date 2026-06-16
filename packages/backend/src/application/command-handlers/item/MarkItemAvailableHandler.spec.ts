import { describe, it, expect, vi } from 'vitest';
import { MarkItemAvailableHandler } from './MarkItemAvailableHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { MarkItemAvailableCommand } from '../../../domain/item/commands/MarkItemAvailableCommand';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'item-1',
    aggregateType: 'item',
    eventType: 'ItemCreated',
    payload: { id: 'item-1', name: 'Shampoo', categoryId: 'cat-1', status: 'to_buy' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('MarkItemAvailableHandler', () => {
  it('throws Item not found when getEvents resolves empty history', async () => {
    const cmd: MarkItemAvailableCommand = {
      type: 'MarkItemAvailableCommand',
      payload: {
        id: 'item-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new MarkItemAvailableHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Item not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.markAvailable with expectedVersion equal to history.length', async () => {
    const cmd: MarkItemAvailableCommand = {
      type: 'MarkItemAvailableCommand',
      payload: {
        id: 'item-1',
      },
    };

    const history = [makeCreatedEvent()];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'item-1',
        aggregateType: 'item',
        eventType: 'ItemMarkedAvailable',
        payload: { id: 'item-1' },
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new MarkItemAvailableHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('item-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('ItemMarkedAvailable');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: MarkItemAvailableCommand = {
      type: 'MarkItemAvailableCommand',
      payload: {
        id: 'item-2',
      },
    };

    const history = [makeCreatedEvent({
      aggregateId: 'item-2',
      payload: {
        id: 'item-2',
        name: 'Toothpaste',
        categoryId: 'cat-2',
        status: 'to_buy',
      } as unknown,
    })];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'item-2',
        aggregateType: 'item',
        eventType: 'ItemMarkedAvailable',
        payload: { id: 'item-2' },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new MarkItemAvailableHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
