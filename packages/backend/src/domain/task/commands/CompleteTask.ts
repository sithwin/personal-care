import type { UUID } from '../../../types';

export interface CompleteTask {
  readonly type: 'CompleteTask';
  readonly payload: {
    readonly id: UUID;
    readonly itemDisposals: Array<{ itemId: UUID; consumed: boolean }>;
  };
}
