import type { UUID } from '../../../types';

export interface StartTaskCommand {
  readonly type: 'StartTaskCommand';
  readonly payload: { readonly id: UUID };
}
