import { describe, it, expect, vi } from 'vitest';
import { DeleteBalanceRuleHandler } from './DeleteBalanceRuleHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { DeleteBalanceRuleCommand } from '../../../domain/balance-rule/commands/DeleteBalanceRuleCommand';
import type { StoredEvent } from '../../../types';
import type { RequestContext } from '../../ports/RequestContext';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'br-1',
    aggregateType: 'balance_rule',
    eventType: 'BalanceRuleCreated',
    payload: { id: 'br-1', categoryId: 'cat-1', minimumCount: 2, frequency: 'weekly', dayRestriction: null },
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

describe('DeleteBalanceRuleHandler', () => {
  it('throws BalanceRule not found when getEvents resolves empty history', async () => {
    const cmd: DeleteBalanceRuleCommand = {
      type: 'DeleteBalanceRuleCommand',
      payload: {
        id: 'br-1',
      },
    };

    const mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockResolvedValue([]),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new DeleteBalanceRuleHandler(mockEventStore);

    await expect(handler.handle(cmd, ctx)).rejects.toThrow('BalanceRule not found');
    expect(mockEventStore.append).not.toHaveBeenCalled();
  });

  it('appends the event from aggregate.delete with expectedVersion equal to history.length', async () => {
    const cmd: DeleteBalanceRuleCommand = {
      type: 'DeleteBalanceRuleCommand',
      payload: {
        id: 'br-1',
      },
    };

    const history = [makeCreatedEvent()];

    const mockStoredEvents: StoredEvent[] = [
      {
        id: 2,
        aggregateId: 'br-1',
        aggregateType: 'balance_rule',
        eventType: 'BalanceRuleDeleted',
        payload: { id: 'br-1' },
        version: 2,
        createdAt: new Date(),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(mockStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new DeleteBalanceRuleHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(mockEventStore.getEvents).toHaveBeenCalledWith('br-1');
    expect(mockEventStore.append).toHaveBeenCalledOnce();
    const [events, expectedVersion] = vi.mocked(mockEventStore.append).mock.calls[0]!;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('BalanceRuleDeleted');
    expect(expectedVersion).toBe(history.length);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: DeleteBalanceRuleCommand = {
      type: 'DeleteBalanceRuleCommand',
      payload: {
        id: 'br-2',
      },
    };

    const history = [makeCreatedEvent({
      aggregateId: 'br-2',
      payload: {
        id: 'br-2',
        categoryId: 'cat-2',
        minimumCount: 2,
        frequency: 'weekly',
        dayRestriction: null,
      } as unknown,
    })];

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'br-2',
        aggregateType: 'balance_rule',
        eventType: 'BalanceRuleDeleted',
        payload: { id: 'br-2' },
        version: 2,
        createdAt: new Date('2026-06-16'),
      },
    ];

    const mockEventStore = {
      append: vi.fn().mockResolvedValue(customStoredEvents),
      getEvents: vi.fn().mockResolvedValue(history),
      getAllEventsSince: vi.fn(),
    } as unknown as IEventStore;

    const handler = new DeleteBalanceRuleHandler(mockEventStore);
    const result = await handler.handle(cmd, ctx);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
