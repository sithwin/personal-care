import { describe, it, expect, vi } from 'vitest';
import { CompleteProjectHandler } from './CompleteProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CompleteProjectCommand } from '../../../domain/project/commands/CompleteProjectCommand';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

function makeProjectCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'p-1',
    aggregateType: 'project',
    eventType: 'ProjectCreated',
    payload: { id: 'p-1', name: 'Renovate kitchen', categoryId: 'cat-1' },
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

describe('CompleteProjectHandler', () => {
  it('throws "Project not found" when getEvents resolves empty history', async () => {
    const cmd: CompleteProjectCommand = {
      type: 'CompleteProjectCommand',
      payload: {
        id: 'p-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CompleteProjectHandler(mockEventStore);

    await expect(handler.handle(cmd, ctx)).rejects.toThrow('Project not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.complete with expectedVersion equal to history.length', async () => {
    const cmd: CompleteProjectCommand = {
      type: 'CompleteProjectCommand',
      payload: {
        id: 'p-1',
      },
    };

    const history = [makeProjectCreatedEvent()];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'p-1',
        aggregateType: 'project',
        eventType: 'ProjectCompleted',
        payload: { id: 'p-1' },
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CompleteProjectHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('p-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('ProjectCompleted');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CompleteProjectCommand = {
      type: 'CompleteProjectCommand',
      payload: {
        id: 'p-2',
      },
    };

    const history = [makeProjectCreatedEvent({
      aggregateId: 'p-2',
      payload: {
        id: 'p-2',
        name: 'Plan vacation',
        categoryId: 'cat-2',
      } as unknown,
    })];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'p-2',
        aggregateType: 'project',
        eventType: 'ProjectCompleted',
        payload: { id: 'p-2' },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CompleteProjectHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
