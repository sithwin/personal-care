import type { UUID } from '../../../types';

export interface DetachResourceFromTaskCommand {
  readonly type: 'DetachResourceFromTaskCommand';
  readonly payload: { readonly taskId: UUID; readonly resourceId: UUID };
}
