import type { UUID } from '../../../types';

export interface DetachResourceFromTask {
  readonly type: 'DetachResourceFromTask';
  readonly payload: { readonly taskId: UUID; readonly resourceId: UUID };
}
