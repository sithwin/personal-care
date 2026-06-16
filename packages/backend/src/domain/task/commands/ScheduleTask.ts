import type { UUID } from '../../../types';

export interface ScheduleTask {
  readonly type: 'ScheduleTask';
  readonly payload: { readonly id: UUID; readonly scheduledDate: string; readonly scheduledStartTime: string };
}
