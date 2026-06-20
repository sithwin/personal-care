import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateResourceHandler } from './CreateResourceHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateResourceCommand } from '../../../domain/resource/commands/CreateResourceCommand';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

const TEST_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const ctx = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
} as unknown as RequestContext;

describe('CreateResourceHandler', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(TEST_UUID as ReturnType<typeof crypto.randomUUID>);
  });

  it('appends ResourceCreated with aggregateId from randomUUID and expectedVersion 0', async () => {
    const cmd: CreateResourceCommand = {
      type: 'CreateResourceCommand',
      payload: { title: 'GTD Book', type: 'link', url: 'https://example.com' },
    };
    const mockStoredEvents: StoredEvent[] = [{
      id: 1, aggregateId: TEST_UUID, aggregateType: 'resource',
      eventType: 'ResourceCreated', payload: cmd.payload, version: 1, createdAt: new Date(),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn(), getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateResourceHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.append).toHaveBeenCalledWith(
      [expect.objectContaining({ aggregateId: TEST_UUID, eventType: 'ResourceCreated' })],
      0, ctx,
    );
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateResourceCommand = {
      type: 'CreateResourceCommand',
      payload: { title: 'My Notes', type: 'note' },
    };
    const customStoredEvents: StoredEvent[] = [{
      id: 99, aggregateId: TEST_UUID, aggregateType: 'resource',
      eventType: 'ResourceCreated', payload: cmd.payload, version: 1, createdAt: new Date('2026-06-20'),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn(), getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateResourceHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
