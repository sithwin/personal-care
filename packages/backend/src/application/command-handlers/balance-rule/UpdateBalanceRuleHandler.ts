import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateBalanceRule } from '../../../domain/balance-rule/commands/UpdateBalanceRule';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class UpdateBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateBalanceRule): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = BalanceRule.reconstruct(history);
    if (aggregate === null) throw new Error('BalanceRule not found');
    const event = aggregate.update(cmd);
    return this.eventStore.append([event], history.length);
  }
}
