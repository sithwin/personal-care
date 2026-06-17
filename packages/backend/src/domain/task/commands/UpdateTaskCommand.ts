import type { UUID, EstimatedDuration } from '../../../types';

export interface UpdateTaskCommand {
  readonly type: 'UpdateTaskCommand';
  readonly payload: {
    readonly id: UUID;
    readonly name?: string;
    readonly categoryId?: UUID;
    readonly description?: string;
    readonly estimatedDuration?: EstimatedDuration;
    readonly dueDate?: string;
  };
}
