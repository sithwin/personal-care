import { DomainEvent } from '../../shared/DomainEvent';
import type { UUID } from '../../../types';
import type { CreateBalanceRuleCommand } from '../commands/CreateBalanceRuleCommand';

export class BalanceRuleCreated extends DomainEvent {
  constructor(aggregateId: UUID, payload: CreateBalanceRuleCommand['payload']) {
    super('BalanceRuleCreated', aggregateId, 'balance-rule', payload as unknown as Record<string, unknown>);
  }
}
