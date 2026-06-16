import { describe, it, expect, vi } from 'vitest';
import { UpdateResourceHandler } from './UpdateResourceHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { UpdateResourceCommand } from '../../../domain/resource/commands/UpdateResourceCommand';
import type { StoredEvent } from '../../../types';
import { ResourceCreated } from '../../../domain/resource/events/ResourceCreated';
import { ResourceUpdated } from '../../../domain/resource/events/ResourceUpdated';

function toStoredEvent(event: ResourceCreated | ResourceUpdated, id: number): StoredEvent {
  return {
    id,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    eventType: event.eventType,
    payload: event.payload,
    version: id,
    createdAt: new Date(),
  };
}

describe('UpdateResourceHandler', () => {
  it('rejects with "Resource not found" when getEvents resolves to empty array', async () => {
    const cmd: UpdateResourceCommand = {
      type: 'UpdateResourceCommand',
      payload: {
        id: 'res-1',
        title: 'Updated Title',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new UpdateResourceHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Resource not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends ResourceUpdated event with correct expectedVersion on realistic history', async () => {
    const cmd: UpdateResourceCommand = {
      type: 'UpdateResourceCommand',
      payload: {
        id: 'res-1',
        title: 'Updated Title',
        notes: 'Updated notes',
      },
    };

    const created = new ResourceCreated({
      id: 'res-1',
      title: 'Original Title',
      type: 'link',
      url: 'https://example.com',
    });
    const history = [toStoredEvent(created, 1)];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'res-1',
        aggregateType: 'resource',
        eventType: 'ResourceUpdated',
        payload: cmd.payload,
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new UpdateResourceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('res-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ResourceUpdated);
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: UpdateResourceCommand = {
      type: 'UpdateResourceCommand',
      payload: {
        id: 'res-2',
        url: 'https://updated.example.com',
      },
    };

    const created = new ResourceCreated({
      id: 'res-2',
      title: 'Resource',
      type: 'document',
    });
    const history = [toStoredEvent(created, 1)];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'res-2',
        aggregateType: 'resource',
        eventType: 'ResourceUpdated',
        payload: cmd.payload,
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new UpdateResourceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
