import type { UUID } from '../../../types';

export interface DeleteBalanceRuleCommand {
  readonly type: 'DeleteBalanceRuleCommand';
  readonly payload: { readonly id: UUID };
}
