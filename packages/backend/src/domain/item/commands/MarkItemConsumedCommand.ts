import type { UUID } from '../../../types';

export interface MarkItemConsumedCommand {
  readonly type: 'MarkItemConsumedCommand';
  readonly payload: { readonly id: UUID };
}
