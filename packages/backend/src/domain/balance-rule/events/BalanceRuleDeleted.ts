import { DomainEvent } from '../../shared/DomainEvent';
import type { DeleteBalanceRule } from '../commands/DeleteBalanceRule';

export class BalanceRuleDeleted extends DomainEvent {
  constructor(readonly payload: DeleteBalanceRule['payload']) {
    super('BalanceRuleDeleted', payload.id, 'balance_rule', payload as unknown as Record<string, unknown>);
  }
}
