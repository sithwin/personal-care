import type { UUID } from '../../../types';

export interface SkipRecurrence {
  readonly type: 'SkipRecurrence';
  readonly payload: { readonly id: UUID };
}
