import type { IEventStore } from '../../ports/IEventStore';
import type { StoredEvent } from '../../../types';
import type { DeleteBalanceRuleCommand } from '../../../domain/balance-rule/commands/DeleteBalanceRuleCommand';
import type { RequestContext } from '../../ports/RequestContext';
import { BalanceRule } from '../../../domain/balance-rule/BalanceRule';

export class DeleteBalanceRuleHandler {
  constructor(private readonly eventStore: IEventStore) {}

  async handle(cmd: DeleteBalanceRuleCommand, ctx: RequestContext): Promise<StoredEvent[]> {
    ctx.log.info({ logEvent: 'deleteBalanceRule.handle', payload: { id: cmd.payload.id } });
    const history = await this.eventStore.getEvents(cmd.payload.id);
    const aggregate = BalanceRule.reconstruct(history);
    if (aggregate === null) throw new Error('BalanceRule not found');
    const event = aggregate.delete(cmd);
    const stored = await this.eventStore.append([event], history.length, ctx);
    ctx.log.info({ logEvent: 'deleteBalanceRule.persisted', payload: { id: cmd.payload.id } });
    return stored;
  }
}
