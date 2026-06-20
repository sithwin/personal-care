import { describe, it, expect, vi } from 'vitest';
import { StartTaskHandler } from './StartTaskHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { StartTaskCommand } from '../../../domain/task/commands/StartTaskCommand';
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

describe('StartTaskHandler', () => {
  it('throws Task not found when getEvents resolves empty history', async () => {
    const cmd: StartTaskCommand = {
      type: 'StartTaskCommand',
      payload: {
        id: 'task-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new StartTaskHandler(mockEventStore);

    await expect(handler.handle(cmd, ctx)).rejects.toThrow('Task not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.start with expectedVersion equal to history.length', async () => {
    const cmd: StartTaskCommand = {
      type: 'StartTaskCommand',
      payload: {
        id: 'task-1',
      },
    };

    const history = [makeCreatedEvent()];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'task-1',
        aggregateType: 'task',
        eventType: 'TaskStarted',
        payload: { id: 'task-1' },
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new StartTaskHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('task-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('TaskStarted');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: StartTaskCommand = {
      type: 'StartTaskCommand',
      payload: {
        id: 'task-2',
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
        eventType: 'TaskStarted',
        payload: { id: 'task-2' },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new StartTaskHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
