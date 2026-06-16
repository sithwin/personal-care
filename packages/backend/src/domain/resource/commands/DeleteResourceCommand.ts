import type { UUID } from '../../../types';

export interface DeleteResourceCommand {
  type: 'DeleteResourceCommand';
  payload: {
    id: UUID;
  };
}
