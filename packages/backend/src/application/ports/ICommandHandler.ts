import type { StoredEvent } from '../../types';
import type { RequestContext } from './RequestContext';

export interface ICommandHandler<TCommand> {
  handle(cmd: TCommand, ctx: RequestContext): Promise<StoredEvent[]>;
}
