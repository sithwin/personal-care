import { describe, it, expect, vi } from 'vitest';
import { DeleteResourceHandler } from './DeleteResourceHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { DeleteResourceCommand } from '../../../domain/resource/commands/DeleteResourceCommand';
import type { StoredEvent } from '../../../types';
import { ResourceCreated } from '../../../domain/resource/events/ResourceCreated';
import { ResourceDeleted } from '../../../domain/resource/events/ResourceDeleted';

function toStoredEvent(event: ResourceCreated | ResourceDeleted, id: number): StoredEvent {
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

describe('DeleteResourceHandler', () => {
  it('rejects with "Resource not found" when getEvents resolves to empty array', async () => {
    const cmd: DeleteResourceCommand = {
      type: 'DeleteResourceCommand',
      payload: {
        id: 'res-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new DeleteResourceHandler(mockEventStore);

    await expect(handler.handle(cmd)).rejects.toThrow('Resource not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends ResourceDeleted event with correct expectedVersion on realistic history', async () => {
    const cmd: DeleteResourceCommand = {
      type: 'DeleteResourceCommand',
      payload: {
        id: 'res-1',
      },
    };

    const created = new ResourceCreated({
      id: 'res-1',
      title: 'GTD Book',
      type: 'link',
      url: 'https://example.com',
    });
    const history = [toStoredEvent(created, 1)];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'res-1',
        aggregateType: 'resource',
        eventType: 'ResourceDeleted',
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

    const handler = new DeleteResourceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('res-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ResourceDeleted);
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: DeleteResourceCommand = {
      type: 'DeleteResourceCommand',
      payload: {
        id: 'res-2',
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
        eventType: 'ResourceDeleted',
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

    const handler = new DeleteResourceHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
