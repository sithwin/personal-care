import type { ICommandBus } from '../../application/ports/ICommandBus';
import type { ICommandHandler } from '../../application/ports/ICommandHandler';
import type { StoredEvent } from '../../types';
import { childLogger } from '../logger';

const log = childLogger('CommandBus');

export class CommandBus implements ICommandBus {
  private readonly registry = new Map<string, (cmd: Record<string, unknown>) => Promise<StoredEvent[]>>();

  constructor(private readonly onEventsStored?: (events: StoredEvent[]) => Promise<void>) {}

  register<TCmd>(commandType: string, handler: ICommandHandler<TCmd>): void {
    this.registry.set(commandType, (cmd) => handler.handle(cmd as TCmd));
  }

  async dispatch(command: { type: string; payload: Record<string, unknown> }): Promise<StoredEvent[]> {
    const handler = this.registry.get(command.type);
    if (!handler) {
      log.warn({ commandType: command.type }, 'No handler registered for command');
      throw new Error(`No handler registered for command: ${command.type}`);
    }
    log.debug({ commandType: command.type }, 'Dispatching command');
    const stored = await handler(command);
    log.info(
      { commandType: command.type, eventCount: stored.length, events: stored.map(event => event.eventType) },
      'Command dispatched',
    );
    await this.onEventsStored?.(stored);
    return stored;
  }
}
