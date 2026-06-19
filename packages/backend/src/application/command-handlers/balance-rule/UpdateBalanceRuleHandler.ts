import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { UpdateBalanceRuleCommand } from '../../../domain/balance-rule/commands/UpdateBalanceRuleCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class UpdateBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: UpdateBalanceRuleCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'updateBalanceRule.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = BalanceRule.reconstruct(history);
    if (aggregate === null) throw new Error('BalanceRule not found');
    const event = aggregate.update(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'updateBalanceRule.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
