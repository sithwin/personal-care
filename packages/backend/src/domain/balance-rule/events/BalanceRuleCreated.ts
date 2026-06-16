import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateBalanceRuleCommand } from '../commands/CreateBalanceRuleCommand';

export class BalanceRuleCreated extends DomainEvent {
  constructor(readonly payload: CreateBalanceRuleCommand['payload']) {
    super('BalanceRuleCreated', payload.id, 'balance_rule', payload as unknown as Record<string, unknown>);
  }
}
