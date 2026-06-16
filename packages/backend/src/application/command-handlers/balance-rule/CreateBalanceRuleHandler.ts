import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateBalanceRuleCommand } from '../../../domain/balance-rule/commands/CreateBalanceRuleCommand';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class CreateBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateBalanceRuleCommand): Promise<StoredEvent[]> {
    const event = BalanceRule.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
