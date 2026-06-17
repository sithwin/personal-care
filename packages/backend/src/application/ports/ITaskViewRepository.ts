export interface UpdateTaskData {
  name: string | null;
  categoryId: string | null;
  description: string | null;
  estimatedDurationValue: number | null;
  estimatedDurationUnit: string | null;
  dueDate: string | null;
}

export interface InsertTaskData {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  projectId: string | null;
  dueDate: string | null;
  estimatedDurationValue: number | null;
  estimatedDurationUnit: string | null;
}

export interface TaskViewRow {
  startedAt: Date | null;
  completedAt: Date | null;
  dueDate: Date | null;
  recurrenceRule: unknown | null;
}

export interface ITaskViewRepository {
  insert(data: InsertTaskData): Promise<void>;
  markStarted(id: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  reschedule(id: string, nextDueDate: string): Promise<void>;
  setSchedule(id: string, scheduledDate: string, scheduledStartTime: string): Promise<void>;
  setRecurrence(id: string, recurrenceRule: unknown, dueDate: string | null): Promise<void>;
  setDueDate(id: string, dueDate: string): Promise<void>;
  setProjectId(id: string, projectId: string): Promise<void>;
  updateFields(id: string, data: UpdateTaskData): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
  findById(id: string): Promise<TaskViewRow | null>;
  getItemStatusesForTask(taskId: string): Promise<string[]>;
  insertItemRequirement(taskId: string, itemId: string, consumable: boolean, itemStatus: string): Promise<void>;
  updateItemStatusForItem(itemId: string, status: string): Promise<void>;
  getTaskIdsForItem(itemId: string): Promise<string[]>;
}
