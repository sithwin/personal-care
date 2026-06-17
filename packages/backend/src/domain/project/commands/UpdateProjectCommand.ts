import type { UUID } from '../../../types';
export interface UpdateProjectCommand {
  type: 'UpdateProjectCommand';
  payload: { id: UUID; name?: string; description?: string; priority?: 'low' | 'medium' | 'high'; };
}
