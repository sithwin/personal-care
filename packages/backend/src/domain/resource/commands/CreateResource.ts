import type { UUID, ResourceType } from '../../../types';

export interface CreateResource {
  type: 'CreateResource';
  payload: {
    id: UUID;
    title: string;
    type: ResourceType;
    url?: string;
    notes?: string;
    categoryId?: UUID;
  };
}
