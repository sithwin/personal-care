import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteBalanceRuleCommand } from '../commands/DeleteBalanceRuleCommand';

export class BalanceRuleDeleted extends DomainEvent {
  constructor(readonly payload: DeleteBalanceRuleCommand['payload']) {
    super('BalanceRuleDeleted', payload.id, 'balance_rule', payload as unknown as Record<string, unknown>);
  }
}
