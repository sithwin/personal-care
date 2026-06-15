import { DomainEvent, RecurrenceRule } from '../../types';
import { TaskCommand, TaskState } from './types';

function addInterval(date: Date, rule: RecurrenceRule): Date {
  const d = new Date(date);
  if (rule.unit === 'day') d.setDate(d.getDate() + rule.interval);
  else if (rule.unit === 'week') d.setDate(d.getDate() + rule.interval * 7);
  else if (rule.unit === 'month') d.setMonth(d.getMonth() + rule.interval);
  else if (rule.unit === 'year') d.setFullYear(d.getFullYear() + rule.interval);
  return d;
}

function reconstruct(events: Pick<DomainEvent, 'eventType' | 'payload'>[]): TaskState | null {
  let state: TaskState | null = null;
  for (const e of events) {
    const p = e.payload as Record<string, unknown>;
    if (e.eventType === 'TaskCreated') {
      state = { id: p.id as string, name: p.name as string, categoryId: p.categoryId as string, started: false, completed: false, recurrenceRule: null, dueDate: (p.dueDate as string) ?? null };
    } else if (state) {
      if (e.eventType === 'TaskStarted') state.started = true;
      else if (e.eventType === 'TaskCompleted') state.completed = true;
      else if (e.eventType === 'TaskRescheduled') { state.completed = false; state.started = false; state.dueDate = p.nextDueDate as string; }
      else if (e.eventType === 'TaskRecurrenceSet') { state.recurrenceRule = p.recurrenceRule as RecurrenceRule; if (p.dueDate) state.dueDate = p.dueDate as string; }
      else if (e.eventType === 'RecurrenceSkipped') state.dueDate = p.nextDueDate as string;
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
  }
}
