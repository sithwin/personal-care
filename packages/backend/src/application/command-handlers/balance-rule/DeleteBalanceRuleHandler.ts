import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteBalanceRule } from '../../../domain/balance-rule/commands/DeleteBalanceRule';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class DeleteBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DeleteBalanceRule): Promise<StoredEvent[]> {
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = BalanceRule.reconstruct(history);
    if (aggregate === null) throw new Error('BalanceRule not found');
    const event = aggregate.delete(cmd);
    return this.eventStore.append([event], history.length);
  }
}
