import { randomUUID } from 'crypto';
import type { ICommandBus } from '../../application/ports/ICommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
import type { ILogger } from '../../application/ports/ILogger';
import type { RequestContext } from '../../application/ports/RequestContext';
import type { StoredEvent } from '../../types';
import { childLogger } from '../logger';

const log = childLogger('CommandBus');

export class CommandBus implements ICommandBus {
  private readonly registry = new Map<string, (cmd: Record<string, unknown>, ctx: RequestContext) => Promise<StoredEvent[]>>();

  constructor(
    private readonly onEventsStored?: (events: StoredEvent[], ctx: RequestContext) => Promise<void>,
  ) {}

  register<TCmd>(commandType: string, handler: ICommandHandler<TCmd>): void {
    this.registry.set(commandType, (cmd, ctx) => handler.handle(cmd as TCmd, ctx));
  }

  async dispatch(
    command: { type: string; payload: Record<string, unknown> },
    httpCtx: { requestId: string; log: ILogger },
  ): Promise<StoredEvent[]> {
    const handler = this.registry.get(command.type);
    if (!handler) {
      log.warn({ commandType: command.type }, 'No handler registered for command');
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    const correlationId = randomUUID();
    const ctx: RequestContext = {
      requestId: httpCtx.requestId,
      correlationId,
      log: httpCtx.log.child({ correlationId }),
    };

    ctx.log.info({ logEvent: 'commandBus.received', commandType: command.type });
    const stored = await handler(command, ctx);
    ctx.log.info({ logEvent: 'commandBus.stored', commandType: command.type, events: stored.map(e => e.eventType) });

    await this.onEventsStored?.(stored, ctx);

    ctx.log.info({ logEvent: 'commandBus.projectorsComplete', commandType: command.type });
    return stored;
  }
}
