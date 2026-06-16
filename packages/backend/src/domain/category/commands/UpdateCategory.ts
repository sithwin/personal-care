import type { UUID } from '../../../types';

export interface UpdateCategory {
  readonly type: 'UpdateCategory';
  readonly payload: {
    readonly id: UUID;
    readonly name?: string;
    readonly icon?: string;
    readonly color?: string;
  };
}
