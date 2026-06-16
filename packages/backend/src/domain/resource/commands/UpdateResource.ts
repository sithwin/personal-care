import type { UUID } from '../../../types';

export interface UpdateResource {
  type: 'UpdateResource';
  payload: {
    id: UUID;
    title?: string;
    url?: string;
    notes?: string;
  };
}
