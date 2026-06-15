import type { TaskViewRow } from '../ports/ITaskViewRepository';

export function deriveTaskStatus(task: TaskViewRow, itemStatuses: string[]): string {
  const hasPendingItems = itemStatuses.some(s => s === 'to_buy');
  if (task.completedAt && !task.recurrenceRule) return 'done';
  if (task.startedAt && !task.completedAt) return 'ongoing';
  if (hasPendingItems) return 'pending';
  if (task.dueDate && new Date(task.dueDate) > new Date()) return 'planned';
  return 'ready';
}
