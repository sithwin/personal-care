import type { UUID } from '../../../types';

export interface AttachResourceToTaskCommand {
  readonly type: 'AttachResourceToTaskCommand';
  readonly payload: { readonly taskId: UUID; readonly resourceId: UUID };
}
