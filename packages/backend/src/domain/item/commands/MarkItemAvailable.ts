import type { UUID } from '../../../types';

export interface MarkItemAvailable {
  readonly type: 'MarkItemAvailable';
  readonly payload: { readonly id: UUID };
}
