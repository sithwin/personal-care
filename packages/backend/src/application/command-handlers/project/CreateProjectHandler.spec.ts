import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProjectHandler } from './CreateProjectHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateProjectCommand } from '../../../domain/project/commands/CreateProjectCommand';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

const TEST_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const ctx = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
} as unknown as RequestContext;

describe('CreateProjectHandler', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(TEST_UUID as ReturnType<typeof crypto.randomUUID>);
  });

  it('appends ProjectCreated with aggregateId from randomUUID and expectedVersion 0', async () => {
    const cmd: CreateProjectCommand = {
      type: 'CreateProjectCommand',
      payload: { name: 'Home Reno', categoryId: 'cat-1' },
    };
    const mockStoredEvents: StoredEvent[] = [{
      id: 1, aggregateId: TEST_UUID, aggregateType: 'project',
      eventType: 'ProjectCreated', payload: cmd.payload, version: 1, createdAt: new Date(),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn(), getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateProjectHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.append).toHaveBeenCalledWith(
      [expect.objectContaining({ aggregateId: TEST_UUID, eventType: 'ProjectCreated' })],
      0, ctx,
    );
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateProjectCommand = {
      type: 'CreateProjectCommand',
      payload: { name: 'Garden Overhaul', categoryId: 'cat-3' },
    };
    const customStoredEvents: StoredEvent[] = [{
      id: 99, aggregateId: TEST_UUID, aggregateType: 'project',
      eventType: 'ProjectCreated', payload: cmd.payload, version: 1, createdAt: new Date('2026-06-20'),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn(), getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateProjectHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
