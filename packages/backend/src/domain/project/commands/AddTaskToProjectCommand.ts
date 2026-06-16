import type { UUID } from '../../../types';

export interface AddTaskToProjectCommand {
  type: 'AddTaskToProjectCommand';
  payload: {
    projectId: UUID;
    taskId: UUID;
  };
}
