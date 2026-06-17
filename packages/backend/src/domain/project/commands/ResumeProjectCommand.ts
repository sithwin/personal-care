import type { UUID } from '../../../types';
export interface ResumeProjectCommand {
  type: 'ResumeProjectCommand';
  payload: { id: UUID; };
}
