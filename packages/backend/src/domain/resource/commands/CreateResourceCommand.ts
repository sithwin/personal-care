import type { UUID, ResourceType } from '../../../types';

export interface CreateResourceCommand {
  type: 'CreateResourceCommand';
  payload: {
    id: UUID;
    title: string;
    type: ResourceType;
    url?: string;
    notes?: string;
    categoryId?: UUID;
  };
}
