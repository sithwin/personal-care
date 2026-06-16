import { describe, it, expect, vi } from 'vitest';
import { CreateResourceHandler } from './CreateResourceHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateResourceCommand } from '../../../domain/resource/commands/CreateResourceCommand';
import type { StoredEvent } from '../../../types';
import { Resource } from '../../../domain/resource/Resource';

describe('CreateResourceHandler', () => {
  it('appends the event from Resource.create with expectedVersion 0', async () => {
    const cmd: CreateResourceCommand = {
      type: 'CreateResourceCommand',
      payload: {
        id: 'res-1',
        title: 'Documentation link',
        type: 'url',
        url: 'https://example.com',
      },
    };

    const event = Resource.create(cmd);
    const mockStoredEvents: StoredEvent[] = [
      {
        id: 1,
        aggregateId: 'res-1',
        aggregateType: 'resource',
        eventType: 'ResourceCreated',
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

    const handler = new CreateResourceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.append).toHaveBeenCalledWith([event], 0);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateResourceCommand = {
      type: 'CreateResourceCommand',
      payload: {
        id: 'res-2',
        title: 'Research article',
        type: 'document',
        notes: 'Important reference',
        categoryId: 'cat-1',
      },
    };

    const customStoredEvents: StoredEvent[] = [
      {
        id: 42,
        aggregateId: 'res-2',
        aggregateType: 'resource',
        eventType: 'ResourceCreated',
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

    const handler = new CreateResourceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(42);
  });
});
