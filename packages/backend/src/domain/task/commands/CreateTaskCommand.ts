import type { UUID, EstimatedDuration } from '../../../types';

export interface CreateTaskCommand {
  readonly type: 'CreateTaskCommand';
  readonly payload: {
    readonly name: string;
    readonly categoryId: UUID;
    readonly description?: string;
    readonly projectId?: UUID;
    readonly estimatedDuration?: EstimatedDuration;
    readonly dueDate?: string;
  };
}
