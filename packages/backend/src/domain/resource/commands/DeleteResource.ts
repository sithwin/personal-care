import type { UUID } from '../../../types';

export interface DeleteResource {
  type: 'DeleteResource';
  payload: {
    id: UUID;
  };
}
