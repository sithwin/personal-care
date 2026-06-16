import type { UUID } from '../../../types';

export interface ScheduleTaskCommand {
  readonly type: 'ScheduleTaskCommand';
  readonly payload: { readonly id: UUID; readonly scheduledDate: string; readonly scheduledStartTime: string };
}
