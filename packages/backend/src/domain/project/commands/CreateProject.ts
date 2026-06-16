import type { UUID } from '../../../types';

export interface CreateProject {
  type: 'CreateProject';
  payload: {
    id: UUID;
    name: string;
    categoryId: UUID;
    description?: string;
    dueDate?: string;
  };
}
