import type { StoredEvent } from '../../types';
import type { ILogger } from './ILogger';

export interface ICommandBus {
  dispatch(
    command: { type: string; payload: Record<string, unknown> },
    httpCtx: { requestId: string; log: ILogger },
  ): Promise<StoredEvent[]>;
}
