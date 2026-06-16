import type { UUID } from '../../../types';

export interface AddTaskToProject {
  type: 'AddTaskToProject';
  payload: {
    projectId: UUID;
    taskId: UUID;
  };
}
