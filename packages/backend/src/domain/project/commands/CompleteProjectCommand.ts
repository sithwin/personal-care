import type { UUID } from '../../../types';

export interface CompleteProjectCommand {
  type: 'CompleteProjectCommand';
  payload: {
    id: UUID;
  };
}
