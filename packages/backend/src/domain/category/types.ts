import { UUID } from '../../types';

export interface CreateCategoryPayload { id: UUID; name: string; icon: string; color: string; isDefault: boolean; }
export interface UpdateCategoryPayload { id: UUID; name?: string; icon?: string; color?: string; }
export interface DeleteCategoryPayload { id: UUID; }

export type CategoryCommand =
  | { type: 'CreateCategory'; payload: CreateCategoryPayload }
  | { type: 'UpdateCategory'; payload: UpdateCategoryPayload }
  | { type: 'DeleteCategory'; payload: DeleteCategoryPayload };

export interface CategoryState {
  id: UUID;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  deleted: boolean;
}
