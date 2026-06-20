import { describe, it, expect, vi } from 'vitest';
import { BalanceRule } from './BalanceRule';
import type { StoredEvent } from '../../types';

const TEST_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'br-1',
    aggregateType: 'balance-rule',
    eventType: 'BalanceRuleCreated',
    payload: { categoryId: 'cat-1', minimumCount: 2, frequency: 'weekly', dayRestriction: null },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('BalanceRule', () => {
  describe('reconstruct', () => {
    it('returns null for empty history', () => {
      expect(BalanceRule.reconstruct([])).toBeNull();
    });

    it('builds state from BalanceRuleCreated event', () => {
      const aggregate = BalanceRule.reconstruct([makeCreatedEvent()]);
      expect(aggregate).not.toBeNull();
    });

    it('returns null when only non-create events exist', () => {
      const event = makeCreatedEvent({ eventType: 'BalanceRuleUpdated' });
      expect(BalanceRule.reconstruct([event])).toBeNull();
    });
  });

  describe('create', () => {
    it('emits BalanceRuleCreated with aggregateId from randomUUID', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(TEST_UUID as ReturnType<typeof crypto.randomUUID>);
      const cmd = { type: 'CreateBalanceRuleCommand' as const, payload: { categoryId: 'cat-1', minimumCount: 2, frequency: 'weekly' as const, dayRestriction: null } };
      const event = BalanceRule.create(cmd);
      expect(event.eventType).toBe('BalanceRuleCreated');
      expect(event.aggregateId).toBe(TEST_UUID);
      expect(event.payload).toEqual({ categoryId: 'cat-1', minimumCount: 2, frequency: 'weekly', dayRestriction: null });
    });
  });

  describe('update', () => {
    it('emits BalanceRuleUpdated', () => {
      const aggregate = BalanceRule.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.update({ type: 'UpdateBalanceRuleCommand' as const, payload: { id: 'br-1', minimumCount: 5 } });
      expect(event.eventType).toBe('BalanceRuleUpdated');
    });

    it('throws when the rule has been deleted', () => {
      const history = [
        makeCreatedEvent(),
        makeCreatedEvent({ eventType: 'BalanceRuleDeleted', version: 2 }),
      ];
      const aggregate = BalanceRule.reconstruct(history)!;
      expect(() => aggregate.update({ type: 'UpdateBalanceRuleCommand' as const, payload: { id: 'br-1' } }))
        .toThrow('BalanceRule not found');
    });
  });

  describe('delete', () => {
    it('emits BalanceRuleDeleted', () => {
      const aggregate = BalanceRule.reconstruct([makeCreatedEvent()])!;
      const event = aggregate.delete({ type: 'DeleteBalanceRuleCommand' as const, payload: { id: 'br-1' } });
      expect(event.eventType).toBe('BalanceRuleDeleted');
    });

    it('throws when already deleted', () => {
      const history = [
        makeCreatedEvent(),
        makeCreatedEvent({ eventType: 'BalanceRuleDeleted', version: 2 }),
      ];
      const aggregate = BalanceRule.reconstruct(history)!;
      expect(() => aggregate.delete({ type: 'DeleteBalanceRuleCommand' as const, payload: { id: 'br-1' } }))
        .toThrow('BalanceRule not found');
    });
  });
});
