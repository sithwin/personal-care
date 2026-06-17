import type { UUID } from '../../../types';
export interface StartProjectCommand {
  type: 'StartProjectCommand';
  payload: { id: UUID; endDate?: string; };
}
