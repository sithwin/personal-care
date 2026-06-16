import { describe, it, expect, vi } from 'vitest';
import { SkipRecurrenceHandler } from './SkipRecurrenceHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { SkipRecurrenceCommand } from '../../../domain/task/commands/SkipRecurrenceCommand';
import type { StoredEvent } from '../../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'task-1',
    aggregateType: 'task',
    eventType: 'TaskCreated',
    payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SkipRecurrenceHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: SkipRecurrenceCommand = {
      type: 'SkipRecurrenceCommand',
      payload: {
        id: 'task-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new SkipRecurrenceHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Task not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.skipRecurrence with expectedVersion equal to history.length', async () => {
    const cmd: SkipRecurrenceCommand = {
      type: 'SkipRecurrenceCommand',
      payload: {
        id: 'task-1',
      },
    };

    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({
        eventType: 'TaskRecurrenceSet',
        version: 2,
        payload: {
          id: 'task-1',
          recurrenceRule: { interval: 1, unit: 'day' },
          dueDate: '2026-06-16T00:00:00.000Z',
        },
      }),
    ];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 3,
        aggregateId: 'task-1',
        aggregateType: 'task',
        eventType: 'RecurrenceSkipped',
        payload: { id: 'task-1', nextDueDate: '2026-06-17T00:00:00.000Z' },
        version: 3,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new SkipRecurrenceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('task-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('RecurrenceSkipped');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: SkipRecurrenceCommand = {
      type: 'SkipRecurrenceCommand',
      payload: {
        id: 'task-2',
      },
    };

    const history = [
      makeCreatedEvent({
        aggregateId: 'task-2',
        payload: {
          id: 'task-2',
          name: 'Water plants',
          categoryId: 'cat-2',
        } as unknown,
      }),
      makeCreatedEvent({
        aggregateId: 'task-2',
        eventType: 'TaskRecurrenceSet',
        version: 2,
        payload: {
          id: 'task-2',
          recurrenceRule: { interval: 1, unit: 'week' },
          dueDate: '2026-06-16T00:00:00.000Z',
        } as unknown,
      }),
    ];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'task-2',
        aggregateType: 'task',
        eventType: 'RecurrenceSkipped',
        payload: { id: 'task-2', nextDueDate: '2026-06-23T00:00:00.000Z' },
        version: 3,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new SkipRecurrenceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
