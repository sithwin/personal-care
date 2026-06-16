import type { UUID } from '../../../types';

export interface SkipRecurrenceCommand {
  readonly type: 'SkipRecurrenceCommand';
  readonly payload: { readonly id: UUID };
}
