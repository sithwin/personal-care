import type { UUID } from '../../../types';

export interface DeleteBalanceRule {
  readonly type: 'DeleteBalanceRule';
  readonly payload: { readonly id: UUID };
}
