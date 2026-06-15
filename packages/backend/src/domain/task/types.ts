import { UUID, RecurrenceRule, EstimatedDuration } from '../../types';

export interface CreateTaskPayload { id: UUID; name: string; categoryId: UUID; description?: string; projectId?: UUID; estimatedDuration?: EstimatedDuration; dueDate?: string; }
export interface StartTaskPayload { id: UUID; }
export interface CompleteTaskPayload { id: UUID; itemDisposals: Array<{ itemId: UUID; consumed: boolean }>; }
export interface AddItemRequirementPayload { taskId: UUID; itemId: UUID; consumable: boolean; }
export interface AttachResourcePayload { taskId: UUID; resourceId: UUID; }
export interface DetachResourcePayload { taskId: UUID; resourceId: UUID; }
export interface SetTaskRecurrencePayload { id: UUID; recurrenceRule: RecurrenceRule; dueDate?: string; }
export interface SkipRecurrencePayload { id: UUID; }
export interface ScheduleTaskPayload { id: UUID; scheduledDate: string; scheduledStartTime: string; }
export interface PromoteToProjectPayload { taskId: UUID; projectId: UUID; }

export type TaskCommand =
  | { type: 'CreateTask'; payload: CreateTaskPayload }
  | { type: 'StartTask'; payload: StartTaskPayload }
  | { type: 'CompleteTask'; payload: CompleteTaskPayload }
  | { type: 'AddItemRequirement'; payload: AddItemRequirementPayload }
  | { type: 'AttachResourceToTask'; payload: AttachResourcePayload }
  | { type: 'DetachResourceFromTask'; payload: DetachResourcePayload }
  | { type: 'SetTaskRecurrence'; payload: SetTaskRecurrencePayload }
  | { type: 'SkipRecurrence'; payload: SkipRecurrencePayload }
  | { type: 'ScheduleTask'; payload: ScheduleTaskPayload }
  | { type: 'PromoteToProject'; payload: PromoteToProjectPayload };

export interface TaskState {
  id: UUID;
  name: string;
  categoryId: UUID;
  started: boolean;
  completed: boolean;
  recurrenceRule: RecurrenceRule | null;
  dueDate: string | null;
}
