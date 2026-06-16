import { describe, it, expect } from 'vitest';
import { Task } from './Task';
import type { StoredEvent } from '../../types';

function makeCreatedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: 1,
    aggregateId: 'task-1',
    aggregateType: 'task',
    eventType: 'TaskCreated',
    payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' },
    version: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('Task', () => {
  it('reconstruct returns null for empty history', () => {
    expect(Task.reconstruct([])).toBeNull();
  });

  it('create emits TaskCreated', () => {
    const event = Task.create({ type: 'CreateTaskCommand' as const, payload: { id: 'task-1', name: 'Oil change', categoryId: 'cat-1' } });
    expect(event.eventType).toBe('TaskCreated');
    expect(event.aggregateId).toBe('task-1');
  });

  it('start emits TaskStarted', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.start({ type: 'StartTaskCommand' as const, payload: { id: 'task-1' } });
    expect(event.eventType).toBe('TaskStarted');
  });

  it('complete emits TaskCompleted', () => {
    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'TaskStarted', version: 2 }),
    ];
    const aggregate = Task.reconstruct(history)!;
    const events = aggregate.complete({ type: 'CompleteTaskCommand' as const, payload: { id: 'task-1', itemDisposals: [] } });
    expect(events[0].eventType).toBe('TaskCompleted');
  });

  it('complete also emits TaskRescheduled when recurrence rule exists', () => {
    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({ eventType: 'TaskStarted', version: 2 }),
      makeCreatedEvent({
        eventType: 'TaskRecurrenceSet',
        version: 3,
        payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'week' }, dueDate: '2026-06-16T00:00:00.000Z' },
      }),
    ];
    const aggregate = Task.reconstruct(history)!;
    const events = aggregate.complete({ type: 'CompleteTaskCommand' as const, payload: { id: 'task-1', itemDisposals: [] } });
    expect(events).toHaveLength(2);
    expect(events[1].eventType).toBe('TaskRescheduled');
  });

  it('skipRecurrence throws when no recurrence rule', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    expect(() => aggregate.skipRecurrence({ type: 'SkipRecurrenceCommand' as const, payload: { id: 'task-1' } }))
      .toThrow('Task has no recurrence rule');
  });

  it('skipRecurrence emits RecurrenceSkipped', () => {
    const history = [
      makeCreatedEvent(),
      makeCreatedEvent({
        eventType: 'TaskRecurrenceSet',
        version: 2,
        payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'day' }, dueDate: '2026-06-16T00:00:00.000Z' },
      }),
    ];
    const aggregate = Task.reconstruct(history)!;
    const event = aggregate.skipRecurrence({ type: 'SkipRecurrenceCommand' as const, payload: { id: 'task-1' } });
    expect(event.eventType).toBe('RecurrenceSkipped');
  });

  it('addItemRequirement emits ItemRequirementAdded', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.addItemRequirement({ type: 'AddItemRequirementCommand' as const, payload: { taskId: 'task-1', itemId: 'item-1', consumable: true } });
    expect(event.eventType).toBe('ItemRequirementAdded');
  });

  it('attachResource emits ResourceAttachedToTask', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.attachResource({ type: 'AttachResourceToTaskCommand' as const, payload: { taskId: 'task-1', resourceId: 'res-1' } });
    expect(event.eventType).toBe('ResourceAttachedToTask');
  });

  it('detachResource emits ResourceDetachedFromTask', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.detachResource({ type: 'DetachResourceFromTaskCommand' as const, payload: { taskId: 'task-1', resourceId: 'res-1' } });
    expect(event.eventType).toBe('ResourceDetachedFromTask');
  });

  it('setRecurrence emits TaskRecurrenceSet', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.setRecurrence({ type: 'SetTaskRecurrenceCommand' as const, payload: { id: 'task-1', recurrenceRule: { interval: 1, unit: 'week' } } });
    expect(event.eventType).toBe('TaskRecurrenceSet');
  });

  it('schedule emits TaskScheduled', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.schedule({ type: 'ScheduleTaskCommand' as const, payload: { id: 'task-1', scheduledDate: '2026-06-20', scheduledStartTime: '09:00' } });
    expect(event.eventType).toBe('TaskScheduled');
  });

  it('promoteToProject emits TaskPromotedToProject', () => {
    const aggregate = Task.reconstruct([makeCreatedEvent()])!;
    const event = aggregate.promoteToProject({ type: 'PromoteToProjectCommand' as const, payload: { taskId: 'task-1', projectId: 'proj-1' } });
    expect(event.eventType).toBe('TaskPromotedToProject');
  });
});
