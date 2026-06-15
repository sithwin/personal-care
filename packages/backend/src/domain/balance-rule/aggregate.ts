import { type DomainEvent } from '../../types';
import { type BalanceRuleCommand } from './types';

export function handleBalanceRuleCommand(
  command: BalanceRuleCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const aggregateType = 'balance_rule';
  const exists = history.some(e => e.eventType === 'BalanceRuleCreated');

  switch (command.type) {
    case 'CreateBalanceRule':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'BalanceRuleCreated', payload: command.payload }];
    case 'UpdateBalanceRule':
      if (!exists) throw new Error('BalanceRule not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'BalanceRuleUpdated', payload: command.payload }];
    case 'DeleteBalanceRule':
      if (!exists) throw new Error('BalanceRule not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'BalanceRuleDeleted', payload: command.payload }];

    default: {
      const _exhaustive: never = command;
      throw new Error(`Unhandled command type: ${(_exhaustive as { type: string }).type}`);
    }
  }
}
