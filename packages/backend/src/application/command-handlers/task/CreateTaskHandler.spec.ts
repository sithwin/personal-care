import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTaskHandler } from './CreateTaskHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateTaskCommand } from '../../../domain/task/commands/CreateTaskCommand';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

const TEST_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const ctx = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() },
} as unknown as RequestContext;

describe('CreateTaskHandler', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(TEST_UUID as ReturnType<typeof crypto.randomUUID>);
  });

  it('appends TaskCreated with aggregateId from randomUUID and expectedVersion 0', async () => {
    const cmd: CreateTaskCommand = {
      type: 'CreateTaskCommand',
      payload: { name: 'Oil change', categoryId: 'cat-1' },
    };
    const mockStoredEvents: StoredEvent[] = [{
      id: 1, aggregateId: TEST_UUID, aggregateType: 'task',
      eventType: 'TaskCreated', payload: cmd.payload, version: 1, createdAt: new Date(),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn(), getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateTaskHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.append).toHaveBeenCalledWith(
      [expect.objectContaining({ aggregateId: TEST_UUID, eventType: 'TaskCreated' })],
      0, ctx,
    );
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateTaskCommand = {
      type: 'CreateTaskCommand',
      payload: { name: 'Dental checkup', categoryId: 'cat-2' },
    };
    const customStoredEvents: StoredEvent[] = [{
      id: 99, aggregateId: TEST_UUID, aggregateType: 'task',
      eventType: 'TaskCreated', payload: cmd.payload, version: 1, createdAt: new Date('2026-06-20'),
    }];
    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn(), getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new CreateTaskHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
