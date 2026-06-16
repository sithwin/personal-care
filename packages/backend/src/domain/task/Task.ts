import type { StoredEvent, UUID, RecurrenceRule } from '../../types';
import type { DomainEvent } from '../shared/DomainEvent';
import type { CreateTask } from './commands/CreateTask';
import type { StartTask } from './commands/StartTask';
import type { CompleteTask } from './commands/CompleteTask';
import type { AddItemRequirement } from './commands/AddItemRequirement';
import type { AttachResourceToTask } from './commands/AttachResourceToTask';
import type { DetachResourceFromTask } from './commands/DetachResourceFromTask';
import type { SetTaskRecurrence } from './commands/SetTaskRecurrence';
import type { SkipRecurrence } from './commands/SkipRecurrence';
import type { ScheduleTask } from './commands/ScheduleTask';
import type { PromoteToProject } from './commands/PromoteToProject';
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
          state = { ...state, started: true };
        } else if (event.eventType === 'TaskCompleted') {
          state = { ...state, completed: true };
        } else if (event.eventType === 'TaskRescheduled') {
          state = { ...state, completed: false, started: false, dueDate: payload.nextDueDate as string };
        } else if (event.eventType === 'TaskRecurrenceSet') {
          state = {
            ...state,
            recurrenceRule: payload.recurrenceRule as RecurrenceRule,
            dueDate: (payload.dueDate as string) ?? state.dueDate,
          };
        } else if (event.eventType === 'RecurrenceSkipped') {
          state = { ...state, dueDate: payload.nextDueDate as string };
        }
      }
    }
    return state !== null ? new Task(state) : null;
  }

  static create(cmd: CreateTask): TaskCreated {
    return new TaskCreated(cmd.payload);
  }

  start(cmd: StartTask): TaskStarted {
    return new TaskStarted(cmd.payload);
  }

  complete(cmd: CompleteTask): DomainEvent[] {
    const events: DomainEvent[] = [new TaskCompleted(cmd.payload)];
    if (this.state.recurrenceRule) {
      const base = this.state.dueDate ? new Date(this.state.dueDate) : new Date();
      const nextDueDate = Task.addInterval(base, this.state.recurrenceRule).toISOString();
      events.push(new TaskRescheduled({ id: cmd.payload.id, nextDueDate }));
    }
    return events;
  }

  addItemRequirement(cmd: AddItemRequirement): ItemRequirementAdded {
    return new ItemRequirementAdded(cmd.payload);
  }

  attachResource(cmd: AttachResourceToTask): ResourceAttachedToTask {
    return new ResourceAttachedToTask(cmd.payload);
  }

  detachResource(cmd: DetachResourceFromTask): ResourceDetachedFromTask {
    return new ResourceDetachedFromTask(cmd.payload);
  }

  setRecurrence(cmd: SetTaskRecurrence): TaskRecurrenceSet {
    return new TaskRecurrenceSet(cmd.payload);
  }

  skipRecurrence(cmd: SkipRecurrence): RecurrenceSkipped {
    if (!this.state.recurrenceRule) throw new Error('Task has no recurrence rule');
    const base = this.state.dueDate ? new Date(this.state.dueDate) : new Date();
    const nextDueDate = Task.addInterval(base, this.state.recurrenceRule).toISOString();
    return new RecurrenceSkipped({ id: cmd.payload.id, nextDueDate });
  }

  schedule(cmd: ScheduleTask): TaskScheduled {
    return new TaskScheduled(cmd.payload);
  }

  promoteToProject(cmd: PromoteToProject): TaskPromotedToProject {
    return new TaskPromotedToProject(cmd.payload);
  }
}
