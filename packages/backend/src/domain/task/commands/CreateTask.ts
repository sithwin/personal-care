import type { UUID, EstimatedDuration } from '../../../types';

export interface CreateTask {
  readonly type: 'CreateTask';
  readonly payload: {
    readonly id: UUID;
    readonly name: string;
    readonly categoryId: UUID;
    readonly description?: string;
    readonly projectId?: UUID;
    readonly estimatedDuration?: EstimatedDuration;
    readonly dueDate?: string;
  };
}
