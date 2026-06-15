import { type DomainEvent, type RecurrenceRule } from '../../types';
import { type TaskCommand, type TaskState } from './types';

function addInterval(date: Date, rule: RecurrenceRule): Date {
  const next = new Date(date);
  if (rule.unit === 'day') next.setDate(next.getDate() + rule.interval);
  else if (rule.unit === 'week') next.setDate(next.getDate() + rule.interval * 7);
  else if (rule.unit === 'month') next.setMonth(next.getMonth() + rule.interval);
  else if (rule.unit === 'year') next.setFullYear(next.getFullYear() + rule.interval);
  return next;
}

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): TaskState | null {
  let state: TaskState | null = null;
  for (const event of events) {
    const payload = event.payload as Record<string, unknown>;
    if (event.eventType === 'TaskCreated') {
      state = { id: payload.id as string, name: payload.name as string, categoryId: payload.categoryId as string, started: false, completed: false, recurrenceRule: null, dueDate: (payload.dueDate as string) ?? null };
    } else if (state) {
      if (event.eventType === 'TaskStarted') state.started = true;
      else if (event.eventType === 'TaskCompleted') state.completed = true;
      else if (event.eventType === 'TaskRescheduled') { state.completed = false; state.started = false; state.dueDate = payload.nextDueDate as string; }
      else if (event.eventType === 'TaskRecurrenceSet') { state.recurrenceRule = payload.recurrenceRule as RecurrenceRule; if (payload.dueDate) state.dueDate = payload.dueDate as string; }
      else if (event.eventType === 'RecurrenceSkipped') state.dueDate = payload.nextDueDate as string;
    }
  }
  return state;
}

export function handleTaskCommand(
  command: TaskCommand,
  history: Pick<DomainEvent, 'eventType' | 'payload'>[]
): Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] {
  const state = reconstruct(history);
  const aggregateType = 'task';

  switch (command.type) {
    case 'CreateTask':
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskCreated', payload: command.payload }];

    case 'StartTask': {
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskStarted', payload: command.payload }];
    }

    case 'CompleteTask': {
      if (!state) throw new Error('Task not found');
      const events: Pick<DomainEvent, 'aggregateId' | 'aggregateType' | 'eventType' | 'payload'>[] = [
        { aggregateId: command.payload.id, aggregateType, eventType: 'TaskCompleted', payload: command.payload },
      ];
      if (state.recurrenceRule) {
        const base = state.dueDate ? new Date(state.dueDate) : new Date();
        const nextDueDate = addInterval(base, state.recurrenceRule).toISOString();
        events.push({ aggregateId: command.payload.id, aggregateType, eventType: 'TaskRescheduled', payload: { id: command.payload.id, nextDueDate } });
      }
      return events;
    }

    case 'AddItemRequirement':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'ItemRequirementAdded', payload: command.payload }];

    case 'AttachResourceToTask':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'ResourceAttachedToTask', payload: command.payload }];

    case 'DetachResourceFromTask':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'ResourceDetachedFromTask', payload: command.payload }];

    case 'SetTaskRecurrence':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskRecurrenceSet', payload: command.payload }];

    case 'SkipRecurrence': {
      if (!state || !state.recurrenceRule) throw new Error('Task has no recurrence rule');
      const base = state.dueDate ? new Date(state.dueDate) : new Date();
      const nextDueDate = addInterval(base, state.recurrenceRule).toISOString();
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'RecurrenceSkipped', payload: { id: command.payload.id, nextDueDate } }];
    }

    case 'ScheduleTask':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.id, aggregateType, eventType: 'TaskScheduled', payload: command.payload }];

    case 'PromoteToProject':
      if (!state) throw new Error('Task not found');
      return [{ aggregateId: command.payload.taskId, aggregateType, eventType: 'TaskPromotedToProject', payload: command.payload }];

    default: {
      const exhaustive: never = command;
      throw new Error(`Unhandled command type: ${(exhaustive as { type: string }).type}`);
    }
  }
}
