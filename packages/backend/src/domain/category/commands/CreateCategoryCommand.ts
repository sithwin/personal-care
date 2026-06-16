import type { UUID } from '../../../types';

export interface CreateCategoryCommand {
  readonly type: 'CreateCategoryCommand';
  readonly payload: {
    readonly id: UUID;
    readonly name: string;
    readonly icon: string;
    readonly color: string;
    readonly isDefault: boolean;
  };
}
