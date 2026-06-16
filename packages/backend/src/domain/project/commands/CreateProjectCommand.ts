import type { UUID } from '../../../types';

export interface CreateProjectCommand {
  type: 'CreateProjectCommand';
  payload: {
    id: UUID;
    name: string;
    categoryId: UUID;
    description?: string;
    dueDate?: string;
  };
}
