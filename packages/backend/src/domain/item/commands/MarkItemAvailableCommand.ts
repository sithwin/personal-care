import type { UUID } from '../../../types';

export interface MarkItemAvailableCommand {
  readonly type: 'MarkItemAvailableCommand';
  readonly payload: { readonly id: UUID };
}
