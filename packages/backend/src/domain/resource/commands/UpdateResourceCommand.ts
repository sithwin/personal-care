import type { UUID } from '../../../types';

export interface UpdateResourceCommand {
  type: 'UpdateResourceCommand';
  payload: {
    id: UUID;
    title?: string;
    url?: string;
    notes?: string;
  };
}
