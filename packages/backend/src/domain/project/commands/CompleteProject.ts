import type { UUID } from '../../../types';

export interface CompleteProject {
  type: 'CompleteProject';
  payload: {
    id: UUID;
  };
}
