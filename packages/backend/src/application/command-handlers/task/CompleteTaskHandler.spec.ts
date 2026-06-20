import { describe, it, expect, vi } from 'vitest';
import { CompleteTaskHandler } from './CompleteTaskHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CompleteTaskCommand } from '../../../domain/task/commands/CompleteTaskCommand';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

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


const ctx = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
} as unknown as RequestContext;

describe('CompleteTaskHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: CompleteTaskCommand = {
      type: 'CompleteTaskCommand',
      payload: {
        id: 'task-1',
        itemDisposals: [],
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CompleteTaskHandler(mockEventStore);

    await expect(handler.handle(cmd, ctx)).rejects.toThrow('Task not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends TaskCompleted event without recurrence, with expectedVersion equal to history.length', async () => {
    const cmd: CompleteTaskCommand = {
      type: 'CompleteTaskCommand',
      payload: {
        id: 'task-1',
        itemDisposals: [],
      },
    };

    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'TaskStarted', version: 2 }),
    ];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 3,
        aggregateId: 'task-1',
        aggregateType: 'task',
        eventType: 'TaskCompleted',
        payload: { id: 'task-1', itemDisposals: [] },
        version: 3,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CompleteTaskHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('task-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('TaskCompleted');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('appends both TaskCompleted and TaskRescheduled events when recurrence rule exists', async () => {
    const cmd: CompleteTaskCommand = {
      type: 'CompleteTaskCommand',
      payload: {
        id: 'task-1',
        itemDisposals: [],
      },
    };

    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'TaskStarted', version: 2 }),
      makeCreatedEvent({
        eventType: 'TaskRecurrenceSet',
        version: 3,
        payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'week' }, dueDate: '2026-06-16T00:00:00.000Z' },
      }),
    ];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 4,
        aggregateId: 'task-1',
        aggregateType: 'task',
        eventType: 'TaskCompleted',
        payload: { id: 'task-1', itemDisposals: [] },
        version: 4,
        createdAt: new Date(),
      },
      {
        id: 5,
        aggregateId: 'task-1',
        aggregateType: 'task',
        eventType: 'TaskRescheduled',
        payload: { id: 'task-1', nextDueDate: '2026-06-23T00:00:00.000Z' },
        version: 5,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CompleteTaskHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('task-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe('TaskCompleted');
    expect(events[1].eventType).toBe('TaskRescheduled');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CompleteTaskCommand = {
      type: 'CompleteTaskCommand',
      payload: {
        id: 'task-2',
        itemDisposals: [],
      },
    };

    const history = [makeCreatedEvent({
      aggregateId: 'task-2',
      payload: {
        id: 'task-2',
        name: 'Water plants',
        categoryId: 'cat-2',
      } as unknown,
    })];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'task-2',
        aggregateType: 'task',
        eventType: 'TaskCompleted',
        payload: { id: 'task-2', itemDisposals: [] },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CompleteTaskHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
