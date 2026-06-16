import { DomainEvent } from '../../shared/DomainEvent';
import type { CreateBalanceRule } from '../commands/CreateBalanceRule';

export class BalanceRuleCreated extends DomainEvent {
  constructor(readonly payload: CreateBalanceRule['payload']) {
    super('BalanceRuleCreated', payload.id, 'balance_rule', payload as unknown as Record<string, unknown>);
  }
}
