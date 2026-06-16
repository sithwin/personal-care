import type { UUID } from '../../../types';

export interface CreateCategory {
  readonly type: 'CreateCategory';
  readonly payload: {
    readonly id: UUID;
    readonly name: string;
    readonly icon: string;
    readonly color: string;
    readonly isDefault: boolean;
  };
}
