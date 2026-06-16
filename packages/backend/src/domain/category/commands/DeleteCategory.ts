import type { UUID } from '../../../types';

export interface DeleteCategory {
  readonly type: 'DeleteCategory';
  readonly payload: { readonly id: UUID };
}
