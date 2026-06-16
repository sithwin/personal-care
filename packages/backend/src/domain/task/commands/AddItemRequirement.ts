import type { UUID } from '../../../types';

export interface AddItemRequirement {
  readonly type: 'AddItemRequirement';
  readonly payload: { readonly taskId: UUID; readonly itemId: UUID; readonly consumable: boolean };
}
