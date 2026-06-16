import type { UUID, RecurrenceRule } from '../../../types';

export interface SetTaskRecurrence {
  readonly type: 'SetTaskRecurrence';
  readonly payload: { readonly id: UUID; readonly recurrenceRule: RecurrenceRule; readonly dueDate?: string };
}
