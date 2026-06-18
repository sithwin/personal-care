export type { CreateTaskCommand } from './CreateTaskCommand';
export type { StartTaskCommand } from './StartTaskCommand';
export type { CompleteTaskCommand } from './CompleteTaskCommand';
export type { AddItemRequirementCommand } from './AddItemRequirementCommand';
export type { RemoveItemRequirementCommand } from './RemoveItemRequirementCommand';
export type { AttachResourceToTaskCommand } from './AttachResourceToTaskCommand';
export type { DetachResourceFromTaskCommand } from './DetachResourceFromTaskCommand';
export type { SetTaskRecurrenceCommand } from './SetTaskRecurrenceCommand';
export type { SkipRecurrenceCommand } from './SkipRecurrenceCommand';
export type { ScheduleTaskCommand } from './ScheduleTaskCommand';
export type { PromoteToProjectCommand } from './PromoteToProjectCommand';

import type { CreateTaskCommand } from './CreateTaskCommand';
import type { StartTaskCommand } from './StartTaskCommand';
import type { CompleteTaskCommand } from './CompleteTaskCommand';
import type { AddItemRequirementCommand } from './AddItemRequirementCommand';
import type { RemoveItemRequirementCommand } from './RemoveItemRequirementCommand';
import type { AttachResourceToTaskCommand } from './AttachResourceToTaskCommand';
import type { DetachResourceFromTaskCommand } from './DetachResourceFromTaskCommand';
import type { SetTaskRecurrenceCommand } from './SetTaskRecurrenceCommand';
import type { SkipRecurrenceCommand } from './SkipRecurrenceCommand';
import type { ScheduleTaskCommand } from './ScheduleTaskCommand';
import type { PromoteToProjectCommand } from './PromoteToProjectCommand';

export type TaskCommand =
  | CreateTaskCommand
  | StartTaskCommand
  | CompleteTaskCommand
  | AddItemRequirementCommand
  | RemoveItemRequirementCommand
  | AttachResourceToTaskCommand
  | DetachResourceFromTaskCommand
  | SetTaskRecurrenceCommand
  | SkipRecurrenceCommand
  | ScheduleTaskCommand
  | PromoteToProjectCommand;
