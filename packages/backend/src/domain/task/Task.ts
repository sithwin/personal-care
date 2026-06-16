import type { StoredEvent, UUID, RecurrenceRule } from '../../types';
import type { DomainEvent } from '../shared/DomainEvent';
import type { CreateTaskCommand } from './commands/CreateTaskCommand';
import type { StartTaskCommand } from './commands/StartTaskCommand';
import type { CompleteTaskCommand } from './commands/CompleteTaskCommand';
import type { AddItemRequirementCommand } from './commands/AddItemRequirementCommand';
import type { AttachResourceToTaskCommand } from './commands/AttachResourceToTaskCommand';
import type { DetachResourceFromTaskCommand } from './commands/DetachResourceFromTaskCommand';
import type { SetTaskRecurrenceCommand } from './commands/SetTaskRecurrenceCommand';
import type { SkipRecurrenceCommand } from './commands/SkipRecurrenceCommand';
import type { ScheduleTaskCommand } from './commands/ScheduleTaskCommand';
import type { PromoteToProjectCommand } from './commands/PromoteToProjectCommand';
import { TaskCreated } from './events/TaskCreated';
import { TaskStarted } from './events/TaskStarted';
import { TaskCompleted } from './events/TaskCompleted';
import { TaskRescheduled } from './events/TaskRescheduled';
import { ItemRequirementAdded } from './events/ItemRequirementAdded';
import { ResourceAttachedToTask } from './events/ResourceAttachedToTask';
import { ResourceDetachedFromTask } from './events/ResourceDetachedFromTask';
import { TaskRecurrenceSet } from './events/TaskRecurrenceSet';
import { RecurrenceSkipped } from './events/RecurrenceSkipped';
import { TaskScheduled } from './events/TaskScheduled';
import { TaskPromotedToProject } from './events/TaskPromotedToProject';

interface TaskState {
  readonly id: UUID;
  readonly name: string;
  readonly categoryId: UUID;
  readonly started: boolean;
  readonly completed: boolean;
  readonly recurrenceRule: RecurrenceRule | null;
  readonly dueDate: string | null;
}

export class Task {
  private constructor(private readonly state: TaskState) {}

  private static addInterval(date: Date, rule: RecurrenceRule): Date {
    const next = new Date(date);
    if (rule.unit === 'day') next.setDate(next.getDate() + rule.interval);
    else if (rule.unit === 'week') next.setDate(next.getDate() + rule.interval * 7);
    else if (rule.unit === 'month') next.setMonth(next.getMonth() + rule.interval);
    else if (rule.unit === 'year') next.setFullYear(next.getFullYear() + rule.interval);
    return next;
  }

  static reconstruct(history: StoredEvent[]): Task | null {
    let state: TaskState | null = null;
    for (const event of history) {
      const payload = event.payload;
      if (event.eventType === 'TaskCreated') {
        state = {
          id: payload.id as UUID,
          name: payload.name as string,
          categoryId: payload.categoryId as UUID,
          started: false,
          completed: false,
          recurrenceRule: null,
          dueDate: (payload.dueDate as string) ?? null,
        };
      } else if (state !== null) {
        if (event.eventType === 'TaskStarted') {
          state = { ...(state as TaskState), started: true };
        } else if (event.eventType === 'TaskCompleted') {
          state = { ...(state as TaskState), completed: true };
        } else if (event.eventType === 'TaskRescheduled') {
          state = { ...(state as TaskState), completed: false, started: false, dueDate: payload.nextDueDate as string };
        } else if (event.eventType === 'TaskRecurrenceSet') {
          state = {
            ...(state as TaskState),
            recurrenceRule: payload.recurrenceRule as RecurrenceRule,
            dueDate: (payload.dueDate as string) ?? state.dueDate,
          };
        } else if (event.eventType === 'RecurrenceSkipped') {
          state = { ...(state as TaskState), dueDate: payload.nextDueDate as string };
        }
      }
    }
    return state !== null ? new Task(state) : null;
  }

  static create(cmd: CreateTaskCommand): TaskCreated {
    return new TaskCreated(cmd.payload);
  }

  start(cmd: StartTaskCommand): TaskStarted {
    return new TaskStarted(cmd.payload);
  }

  complete(cmd: CompleteTaskCommand): DomainEvent[] {
    const events: DomainEvent[] = [new TaskCompleted(cmd.payload)];
    if (this.state.recurrenceRule) {
      const base = this.state.dueDate ? new Date(this.state.dueDate) : new Date();
      const nextDueDate = Task.addInterval(base, this.state.recurrenceRule).toISOString();
      events.push(new TaskRescheduled({ id: cmd.payload.id, nextDueDate }));
    }
    return events;
  }

  addItemRequirement(cmd: AddItemRequirementCommand): ItemRequirementAdded {
    return new ItemRequirementAdded(cmd.payload);
  }

  attachResource(cmd: AttachResourceToTaskCommand): ResourceAttachedToTask {
    return new ResourceAttachedToTask(cmd.payload);
  }

  detachResource(cmd: DetachResourceFromTaskCommand): ResourceDetachedFromTask {
    return new ResourceDetachedFromTask(cmd.payload);
  }

  setRecurrence(cmd: SetTaskRecurrenceCommand): TaskRecurrenceSet {
    return new TaskRecurrenceSet(cmd.payload);
  }

  skipRecurrence(cmd: SkipRecurrenceCommand): RecurrenceSkipped {
    if (!this.state.recurrenceRule) throw new Error('Task has no recurrence rule');
    const base = this.state.dueDate ? new Date(this.state.dueDate) : new Date();
    const nextDueDate = Task.addInterval(base, this.state.recurrenceRule).toISOString();
    return new RecurrenceSkipped({ id: cmd.payload.id, nextDueDate });
  }

  schedule(cmd: ScheduleTaskCommand): TaskScheduled {
    return new TaskScheduled(cmd.payload);
  }

  promoteToProject(cmd: PromoteToProjectCommand): TaskPromotedToProject {
    return new TaskPromotedToProject(cmd.payload);
  }
}
