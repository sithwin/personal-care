import type { UUID } from '../../../types';

export interface AttachResourceToTask {
  readonly type: 'AttachResourceToTask';
  readonly payload: { readonly taskId: UUID; readonly resourceId: UUID };
}
