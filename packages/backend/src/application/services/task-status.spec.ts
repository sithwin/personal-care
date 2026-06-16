import { describe, it, expect } from 'vitest';
import { deriveTaskStatus } from './task-status';
import type { TaskViewRow } from '../ports/ITaskViewRepository';

describe('deriveTaskStatus', () => {
  // Test branch 1: 'done' — task has completedAt AND no recurrenceRule
  it('returns "done" when task has completedAt and no recurrenceRule', () => {
    const task: TaskViewRow = {
      completedAt: new Date('2026-06-16'),
      startedAt: null,
      dueDate: null,
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, []);
    expect(result).toBe('done');
  });

  // Test branch 2: 'ongoing' — task has startedAt AND no completedAt
  it('returns "ongoing" when task has startedAt and no completedAt', () => {
    const task: TaskViewRow = {
      startedAt: new Date('2026-06-01'),
      completedAt: null,
      dueDate: null,
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, []);
    expect(result).toBe('ongoing');
  });

  // Test branch 3: 'pending' — any element in itemStatuses equals 'to_buy'
  it('returns "pending" when itemStatuses contains "to_buy"', () => {
    const task: TaskViewRow = {
      startedAt: null,
      completedAt: null,
      dueDate: null,
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, ['available', 'to_buy', 'consumed']);
    expect(result).toBe('pending');
  });

  // Test branch 4: 'planned' — dueDate is set and in the future
  it('returns "planned" when dueDate is in the future', () => {
    const task: TaskViewRow = {
      dueDate: new Date('2099-12-31'),
      startedAt: null,
      completedAt: null,
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, []);
    expect(result).toBe('planned');
  });

  // Test branch 5: 'ready' — none of the above
  it('returns "ready" when none of the above conditions match', () => {
    const task: TaskViewRow = {
      startedAt: null,
      completedAt: null,
      dueDate: null,
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, []);
    expect(result).toBe('ready');
  });

  // Priority test: task with both startedAt and future dueDate should return 'ongoing', not 'planned'
  it('returns "ongoing" when task is both started and has future dueDate (priority ordering)', () => {
    const task: TaskViewRow = {
      startedAt: new Date('2026-06-01'),
      completedAt: null,
      dueDate: new Date('2099-12-31'),
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, []);
    expect(result).toBe('ongoing');
  });

  // Priority test: task with recurrenceRule should not be 'done' even if completedAt is set
  it('returns "ready" when task has completedAt but recurrenceRule is set (not done)', () => {
    const task: TaskViewRow = {
      completedAt: new Date('2026-06-16'),
      startedAt: null,
      dueDate: null,
      recurrenceRule: { freq: 'DAILY' },
    };
    const result = deriveTaskStatus(task, []);
    expect(result).toBe('ready');
  });

  // Priority test: 'pending' takes priority over 'planned'
  it('returns "pending" when itemStatuses has "to_buy" even if task has future dueDate', () => {
    const task: TaskViewRow = {
      dueDate: new Date('2099-12-31'),
      startedAt: null,
      completedAt: null,
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, ['to_buy']);
    expect(result).toBe('pending');
  });

  // Test with empty itemStatuses and dueDate in the future
  it('returns "planned" when itemStatuses is empty and dueDate is future', () => {
    const task: TaskViewRow = {
      dueDate: new Date('2099-12-31'),
      startedAt: null,
      completedAt: null,
      recurrenceRule: null,
    };
    const result = deriveTaskStatus(task, []);
    expect(result).toBe('planned');
  });
});
