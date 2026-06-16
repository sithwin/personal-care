import { DomainEvent } from '../../shared/DomainEvent';
import type { UpdateBalanceRuleCommand } from '../commands/UpdateBalanceRuleCommand';

export class BalanceRuleUpdated extends DomainEvent {
  constructor(readonly payload: UpdateBalanceRuleCommand['payload']) {
    super('BalanceRuleUpdated', payload.id, 'balance_rule', payload as unknown as Record<string, unknown>);
  }
}
