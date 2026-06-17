import type { UUID } from '../../../types';
export interface PlanProjectCommand {
  type: 'PlanProjectCommand';
  payload: { id: UUID; startDate: string; endDate: string; };
}
