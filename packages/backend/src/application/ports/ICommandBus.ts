import { type StoredEvent } from '../../types';

export interface ICommandBus {
  dispatch(command: { type: string; payload: Record<string, unknown> }): Promise<StoredEvent[]>;
}
