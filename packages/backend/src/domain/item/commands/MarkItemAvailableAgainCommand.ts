import type { UUID } from '../../../types';

export interface MarkItemAvailableAgainCommand {
  readonly type: 'MarkItemAvailableAgainCommand';
  readonly payload: { readonly id: UUID };
}
