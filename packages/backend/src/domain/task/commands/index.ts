export type { CreateTask } from './CreateTask';
export type { StartTask } from './StartTask';
export type { CompleteTask } from './CompleteTask';
export type { AddItemRequirement } from './AddItemRequirement';
export type { AttachResourceToTask } from './AttachResourceToTask';
export type { DetachResourceFromTask } from './DetachResourceFromTask';
export type { SetTaskRecurrence } from './SetTaskRecurrence';
export type { SkipRecurrence } from './SkipRecurrence';
export type { ScheduleTask } from './ScheduleTask';
export type { PromoteToProject } from './PromoteToProject';

import type { CreateTask } from './CreateTask';
import type { StartTask } from './StartTask';
import type { CompleteTask } from './CompleteTask';
import type { AddItemRequirement } from './AddItemRequirement';
import type { AttachResourceToTask } from './AttachResourceToTask';
import type { DetachResourceFromTask } from './DetachResourceFromTask';
import type { SetTaskRecurrence } from './SetTaskRecurrence';
import type { SkipRecurrence } from './SkipRecurrence';
import type { ScheduleTask } from './ScheduleTask';
import type { PromoteToProject } from './PromoteToProject';

export type TaskCommand =
  | CreateTask
  | StartTask
  | CompleteTask
  | AddItemRequirement
  | AttachResourceToTask
  | DetachResourceFromTask
  | SetTaskRecurrence
  | SkipRecurrence
  | ScheduleTask
  | PromoteToProject;
