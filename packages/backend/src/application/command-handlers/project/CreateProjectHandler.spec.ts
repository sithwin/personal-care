import { describe, it, expect, vi } from 'vitest';
import { CreateProjectHandler } from './CreateProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateProjectCommand } from '../../../domain/project/commands/CreateProjectCommand';
import type { StoredEvent } from '../../../types';
import { Project } from '../../../domain/project/Project';

describe('CreateProjectHandler', () => {
  it('appends the event from Project.create with expectedVersion 0', async () => {
    const cmd: CreateProjectCommand = {
      type: 'CreateProjectCommand',
      payload: {
        id: 'p-1',
        name: 'Renovate kitchen',
        categoryId: 'cat-1',
      },
    };

    const event = Project.create(cmd);
    const mockStoredEvents: StoredEvent[] = [
      {
        id: 1,
        aggregateId: 'p-1',
        aggregateType: 'project',
        eventType: 'ProjectCreated',
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

    const handler = new CreateProjectHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.append).toHaveBeenCalledWith([event], 0);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateProjectCommand = {
      type: 'CreateProjectCommand',
      payload: {
        id: 'p-2',
        name: 'Plan vacation',
        categoryId: 'cat-2',
        description: 'Summer 2026',
        dueDate: '2026-08-01',
      },
    };

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'p-2',
        aggregateType: 'project',
        eventType: 'ProjectCreated',
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

    const handler = new CreateProjectHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
