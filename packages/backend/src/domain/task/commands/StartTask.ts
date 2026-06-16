import type { UUID } from '../../../types';

export interface StartTask {
  readonly type: 'StartTask';
  readonly payload: { readonly id: UUID };
}
