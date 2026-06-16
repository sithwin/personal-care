import type { UUID } from '../../../types';

export interface MarkItemAvailableAgain {
  readonly type: 'MarkItemAvailableAgain';
  readonly payload: { readonly id: UUID };
}
