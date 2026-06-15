import { describe, it, expect } from 'vitest';
import { handleTaskCommand } from './aggregate';

const baseHistory = [{ eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } }];

describe('Task aggregate', () => {
  it('CreateTask emits TaskCreated', () => {
    const events = handleTaskCommand(
      { type: 'CreateTask', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } },
      []
    );
    expect(events[0].eventType).toBe('TaskCreated');
  });

  it('StartTask emits TaskStarted', () => {
    const events = handleTaskCommand({ type: 'StartTask', payload: { id: 'task-1' } }, baseHistory);
    expect(events[0].eventType).toBe('TaskStarted');
  });

  it('CompleteTask on non-recurring emits only TaskCompleted', () => {
    const events = handleTaskCommand({ type: 'CompleteTask', payload: { id: 'task-1', itemDisposals: [] } }, baseHistory);
    expect(events.map(e => e.eventType)).toEqual(['TaskCompleted']);
  });

  it('CompleteTask on recurring emits TaskCompleted + TaskRescheduled', () => {
    const history = [
      { eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } },
      { eventType: 'TaskRecurrenceSet', payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'year' }, dueDate: '2026-06-14T00:00:00Z' } },
    ];
    const events = handleTaskCommand({ type: 'CompleteTask', payload: { id: 'task-1', itemDisposals: [] } }, history);
    expect(events.map(e => e.eventType)).toEqual(['TaskCompleted', 'TaskRescheduled']);
    const rescheduled = events[1].payload as { nextDueDate: string };
    expect(new Date(rescheduled.nextDueDate).getFullYear()).toBe(2027);
  });

  it('AddItemRequirement emits ItemRequirementAdded', () => {
    const events = handleTaskCommand(
      { type: 'AddItemRequirement', payload: { taskId: 'task-1', itemId: 'item-1', consumable: true } },
      baseHistory
    );
    expect(events[0].eventType).toBe('ItemRequirementAdded');
  });

  it('PromoteToProject emits TaskPromotedToProject', () => {
    const events = handleTaskCommand(
      { type: 'PromoteToProject', payload: { taskId: 'task-1', projectId: 'proj-1' } },
      baseHistory
    );
    expect(events[0].eventType).toBe('TaskPromotedToProject');
  });

  it('ScheduleTask emits TaskScheduled', () => {
    const events = handleTaskCommand(
      { type: 'ScheduleTask', payload: { id: 'task-1', scheduledDate: '2026-06-15', scheduledStartTime: '09:00' } },
      baseHistory
    );
    expect(events[0].eventType).toBe('TaskScheduled');
  });

  it('SetTaskRecurrence emits TaskRecurrenceSet', () => {
    const events = handleTaskCommand(
      { type: 'SetTaskRecurrence', payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'month' } } },
      baseHistory
    );
    expect(events[0].eventType).toBe('TaskRecurrenceSet');
  });

  it('SkipRecurrence emits RecurrenceSkipped with next due date', () => {
    const history = [
      { eventType: 'TaskCreated', payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-cars' } },
      { eventType: 'TaskRecurrenceSet', payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'year' }, dueDate: '2026-06-14T00:00:00Z' } },
    ];
    const events = handleTaskCommand({ type: 'SkipRecurrence', payload: { id: 'task-1' } }, history);
    expect(events[0].eventType).toBe('RecurrenceSkipped');
    const payload = events[0].payload as { nextDueDate: string };
    expect(new Date(payload.nextDueDate).getFullYear()).toBe(2027);
  });
});
