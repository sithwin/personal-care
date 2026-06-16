import type { StoredEvent } from '../../types';

export interface ICommandHandler<TCommand> {
  handle(cmd: TCommand): Promise<StoredEvent[]>;
}
