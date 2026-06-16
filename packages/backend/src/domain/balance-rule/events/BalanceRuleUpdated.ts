import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateBalanceRule } from '../commands/UpdateBalanceRule';

export class BalanceRuleUpdated extends DomainEvent {
  constructor(readonly payload: UpdateBalanceRule['payload']) {
    super('BalanceRuleUpdated', payload.id, 'balance_rule', payload as unknown as Record<string, unknown>);
  }
}
