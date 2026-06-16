import type { UUID } from '../../../types';

export interface AddItemRequirementCommand {
  readonly type: 'AddItemRequirementCommand';
  readonly payload: { readonly taskId: UUID; readonly itemId: UUID; readonly consumable: boolean };
}
