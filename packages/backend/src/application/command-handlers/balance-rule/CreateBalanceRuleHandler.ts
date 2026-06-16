import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateBalanceRule } from '../../../domain/balance-rule/commands/CreateBalanceRule';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class CreateBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateBalanceRule): Promise<StoredEvent[]> {
    const event = BalanceRule.create(cmd);
    return this.eventStore.append([event], 0);
  }
}
