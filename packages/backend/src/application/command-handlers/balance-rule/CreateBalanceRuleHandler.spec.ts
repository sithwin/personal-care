import { describe, it, expect, vi } from 'vitest';
import { CreateBalanceRuleHandler } from './CreateBalanceRuleHandler';
import type { IEventStore } from '../../ports/IEventStore';
import type { CreateBalanceRuleCommand } from '../../../domain/balance-rule/commands/CreateBalanceRuleCommand';
import type { StoredEvent } from '../../../types';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

describe('CreateBalanceRuleHandler', () => {
  it('appends the event from BalanceRule.create with expectedVersion 0', async () => {
    const cmd: CreateBalanceRuleCommand = {
      type: 'CreateBalanceRuleCommand',
      payload: {
        id: 'br-1',
        categoryId: 'cat-1',
        minimumCount: 2,
        frequency: 'weekly',
        dayRestriction: null,
      },
    };

    const event = BalanceRule.create(cmd);
    const mockStoredEvents: StoredEvent[] = [
      {
        id: 1,
        aggregateId: 'br-1',
        aggregateType: 'balance_rule',
        eventType: 'BalanceRuleCreated',
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

    const handler = new CreateBalanceRuleHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(mockEventStore.append).toHaveBeenCalledWith([event], 0);
    expect(result).toBe(mockStoredEvents);
  });

  it('returns exactly what eventStore.append resolves to', async () => {
    const cmd: CreateBalanceRuleCommand = {
      type: 'CreateBalanceRuleCommand',
      payload: {
        id: 'br-2',
        categoryId: 'cat-2',
        minimumCount: 5,
        frequency: 'daily',
        dayRestriction: 'weekdays',
      },
    };

    const customStoredEvents: StoredEvent[] = [
      {
        id: 99,
        aggregateId: 'br-2',
        aggregateType: 'balance_rule',
        eventType: 'BalanceRuleCreated',
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

    const handler = new CreateBalanceRuleHandler(mockEventStore);
    const result = await handler.handle(cmd);

    expect(result).toStrictEqual(customStoredEvents);
    expect(result[0].id).toBe(99);
  });
});
