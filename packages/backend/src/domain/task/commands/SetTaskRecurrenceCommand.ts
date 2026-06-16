import type { UUID, RecurrenceRule } from '../../../types';

export interface SetTaskRecurrenceCommand {
  readonly type: 'SetTaskRecurrenceCommand';
  readonly payload: { readonly id: UUID; readonly recurrenceRule: RecurrenceRule; readonly dueDate?: string };
}
