import type { UUID } from '../../../types';
export interface PauseProjectCommand {
  type: 'PauseProjectCommand';
  payload: { id: UUID; };
}
