import type { UUID } from '../../../types';

export interface MarkItemConsumed {
  readonly type: 'MarkItemConsumed';
  readonly payload: { readonly id: UUID };
}
