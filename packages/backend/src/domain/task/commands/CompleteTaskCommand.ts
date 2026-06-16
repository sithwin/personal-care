import type { UUID } from '../../../types';

export interface CompleteTaskCommand {
  readonly type: 'CompleteTaskCommand';
  readonly payload: {
    readonly id: UUID;
    readonly itemDisposals: Array<{ itemId: UUID; consumed: boolean }>;
  };
}
