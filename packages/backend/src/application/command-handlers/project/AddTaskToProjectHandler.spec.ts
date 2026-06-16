import { describe, it, expect, vi } from 'vitest';
import { AddTaskToProjectHandler } from './AddTaskToProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { AddTaskToProjectCommand } from '../../../domain/project/commands/AddTaskToProjectCommand';
import type { StoredEvent } from '../../../types';

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

describe('AddTaskToProjectHandler', () => {
  it('throws "Project not found" when getEvents resolves empty history', async () => {
    const cmd: AddTaskToProjectCommand = {
      type: 'AddTaskToProjectCommand',
      payload: {
        projectId: 'p-1',
        taskId: 't-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new AddTaskToProjectHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Project not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.addTask with expectedVersion equal to history.length', async () => {
    const cmd: AddTaskToProjectCommand = {
      type: 'AddTaskToProjectCommand',
      payload: {
        projectId: 'p-1',
        taskId: 't-1',
      },
    };

    const history = [makeProjectCreatedEvent()];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'p-1',
        aggregateType: 'project',
        eventType: 'TaskAddedToProject',
        payload: { projectId: 'p-1', taskId: 't-1' },
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new AddTaskToProjectHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('p-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('TaskAddedToProject');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: AddTaskToProjectCommand = {
      type: 'AddTaskToProjectCommand',
      payload: {
        projectId: 'p-2',
        taskId: 't-2',
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
        eventType: 'TaskAddedToProject',
        payload: { projectId: 'p-2', taskId: 't-2' },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new AddTaskToProjectHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
