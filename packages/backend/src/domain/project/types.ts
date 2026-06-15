import { type UUID } from '../../types';

export interface CreateProjectPayload { id: UUID; name: string; categoryId: UUID; description?: string; dueDate?: string; }
export interface AddTaskToProjectPayload { projectId: UUID; taskId: UUID; }
export interface CompleteProjectPayload { id: UUID; }

export type ProjectCommand =
  | { type: 'CreateProject'; payload: CreateProjectPayload }
  | { type: 'AddTaskToProject'; payload: AddTaskToProjectPayload }
  | { type: 'CompleteProject'; payload: CompleteProjectPayload };

export interface ProjectState { id: UUID; name: string; status: 'active' | 'on_hold' | 'done'; taskIds: UUID[]; }
