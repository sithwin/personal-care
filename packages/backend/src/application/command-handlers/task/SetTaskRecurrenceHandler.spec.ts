import { describe, it, expect, vi } from 'vitest';
import { SetTaskRecurrenceHandler } from './SetTaskRecurrenceHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { SetTaskRecurrenceCommand } from '../../../domain/task/commands/SetTaskRecurrenceCommand';
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

describe('SetTaskRecurrenceHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: SetTaskRecurrenceCommand = {
      type: 'SetTaskRecurrenceCommand',
      payload: {
        id: 'task-1',
        recurrenceRule: { interval: 1, unit: 'week' },
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new SetTaskRecurrenceHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Task not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.setRecurrence with expectedVersion equal to history.length', async () => {
    const cmd: SetTaskRecurrenceCommand = {
      type: 'SetTaskRecurrenceCommand',
      payload: {
        id: 'task-1',
        recurrenceRule: { interval: 1, unit: 'week' },
      },
    };

    const history = [makeCreatedEvent()];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'task-1',
        aggregateType: 'task',
        eventType: 'TaskRecurrenceSet',
        payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'week' } },
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new SetTaskRecurrenceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('task-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('TaskRecurrenceSet');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: SetTaskRecurrenceCommand = {
      type: 'SetTaskRecurrenceCommand',
      payload: {
        id: 'task-2',
        recurrenceRule: { interval: 2, unit: 'day' },
        dueDate: '2026-06-20T10:00:00.000Z',
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
    ];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'task-2',
        aggregateType: 'task',
        eventType: 'TaskRecurrenceSet',
        payload: { id: 'task-2', recurrenceRule: { interval: 2, unit: 'day' }, dueDate: '2026-06-20T10:00:00.000Z' },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new SetTaskRecurrenceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
