import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { CreateBalanceRuleCommand } from '../../../domain/balance-rule/commands/CreateBalanceRuleCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class CreateBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: CreateBalanceRuleCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'createBalanceRule.handle' });
    const event = BalanceRule.create(cmd);
    const stored = await this.eventStore.append([event], 0, ctx);
    ctx.log.info({ logEvent: 'createBalanceRule.persisted', payload: { id: stored[0].aggregateId } });
    return stored;
  }
}
