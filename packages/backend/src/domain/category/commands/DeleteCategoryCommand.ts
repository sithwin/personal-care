import type { UUID } from '../../../types';

export interface DeleteCategoryCommand {
  readonly type: 'DeleteCategoryCommand';
  readonly payload: { readonly id: UUID };
}
