import type { UUID } from '../../../types';

export interface RemoveItemRequirementCommand {
  readonly type: 'RemoveItemRequirementCommand';
  readonly payload: { readonly taskId: UUID; readonly itemId: UUID };
}
