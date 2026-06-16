import { describe, it, expect, vi } from 'vitest';
import { MarkItemConsumedHandler } from './MarkItemConsumedHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { MarkItemConsumedCommand } from '../../../domain/item/commands/MarkItemConsumedCommand';
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

describe('MarkItemConsumedHandler', () => {
  it('throws Item not found when getEvents resolves empty history', async () => {
    const cmd: MarkItemConsumedCommand = {
      type: 'MarkItemConsumedCommand',
      payload: {
        id: 'item-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new MarkItemConsumedHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Item not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.markConsumed with expectedVersion equal to history.length', async () => {
    const cmd: MarkItemConsumedCommand = {
      type: 'MarkItemConsumedCommand',
      payload: {
        id: 'item-1',
      },
    };

    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'ItemMarkedAvailable', version: 2 }),
    ];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 3,
        aggregateId: 'item-1',
        aggregateType: 'item',
        eventType: 'ItemMarkedConsumed',
        payload: { id: 'item-1' },
        version: 3,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new MarkItemConsumedHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('item-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('ItemMarkedConsumed');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: MarkItemConsumedCommand = {
      type: 'MarkItemConsumedCommand',
      payload: {
        id: 'item-2',
      },
    };

    const history = [
      makeCreatedEvent({
        aggregateId: 'item-2',
        payload: {
          id: 'item-2',
          name: 'Toothpaste',
          categoryId: 'cat-2',
          status: 'to_buy',
        } as unknown,
      }),
      makeCreatedEvent({
        aggregateId: 'item-2',
        eventType: 'ItemMarkedAvailable',
        version: 2,
        payload: { id: 'item-2' } as unknown,
      }),
    ];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'item-2',
        aggregateType: 'item',
        eventType: 'ItemMarkedConsumed',
        payload: { id: 'item-2' },
        version: 3,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new MarkItemConsumedHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
