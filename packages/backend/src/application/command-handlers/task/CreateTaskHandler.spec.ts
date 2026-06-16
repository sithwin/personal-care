import { describe, it, expect, vi } from 'vitest';
import { CreateTaskHandler } from './CreateTaskHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateTaskCommand } from '../../../domain/task/commands/CreateTaskCommand';
import type { StoredEvent } from '../../../types';
import { Task } from '../../../domain/task/Task';

describe('CreateTaskHandler', () => {
  it('appends the event from Task.create with expectedVersion 0', async () => {
    const cmd: CreateTaskCommand = {
      type: 'CreateTaskCommand',
      payload: {
        id: 'task-1',
        name: 'Oil change',
        categoryId: 'cat-1',
      },
    };

    const event = Task.create(cmd);
    const mockStoredEvents: StoredEvent[] = [
      {
        id: 1,
        aggregateId: 'task-1',
        aggregateType: 'task',
        eventType: 'TaskCreated',
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

    const handler = new CreateTaskHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.append).toHaveBeenCalledWith([event], 0);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateTaskCommand = {
      type: 'CreateTaskCommand',
      payload: {
        id: 'task-2',
        name: 'Car wash',
        categoryId: 'cat-2',
        description: 'Wash the car thoroughly',
        projectId: 'proj-1',
      },
    };

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'task-2',
        aggregateType: 'task',
        eventType: 'TaskCreated',
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

    const handler = new CreateTaskHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
