import type { UUID } from '../../../types';

export interface UpdateCategoryCommand {
  readonly type: 'UpdateCategoryCommand';
  readonly payload: {
    readonly id: UUID;
    readonly name?: string;
    readonly icon?: string;
    readonly color?: string;
  };
}
