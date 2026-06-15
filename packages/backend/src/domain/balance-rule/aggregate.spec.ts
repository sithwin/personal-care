import { describe, it, expect } from 'vitest';
import { handleBalanceRuleCommand } from './aggregate';

describe('BalanceRule aggregate', () => {
  it('CreateBalanceRule emits BalanceRuleCreated', () => {
    const events = handleBalanceRuleCommand(
      { type: 'CreateBalanceRule', payload: { id: 'br-1', categoryId: 'cat-study', minimumCount: 1, frequency: 'daily', dayRestriction: null } },
      []
    );
    expect(events[0].eventType).toBe('BalanceRuleCreated');
  });

  it('DeleteBalanceRule emits BalanceRuleDeleted', () => {
    const history = [{ eventType: 'BalanceRuleCreated', payload: { id: 'br-1', categoryId: 'cat-study', minimumCount: 1, frequency: 'daily', dayRestriction: null } }];
    const events = handleBalanceRuleCommand({ type: 'DeleteBalanceRule', payload: { id: 'br-1' } }, history);
    expect(events[0].eventType).toBe('BalanceRuleDeleted');
  });
});
