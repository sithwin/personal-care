import type {
  ITaskViewRepository,
  InsertTaskData,
  TaskViewRow,
  UpdateTaskData,
} from '../../../application/ports/ITaskViewRepository';

interface TaskRecord {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  projectId: string | null;
  dueDate: string | null;
  estimatedDurationValue: number | null;
  estimatedDurationUnit: string | null;
  scheduledDate: string | null;
  scheduledStartTime: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  recurrenceRule: unknown | null;
  status: string;
  completionCount: number;
}

interface TaskItemRecord {
  taskId: string;
  itemId: string;
  consumable: boolean;
  itemStatus: string;
}

export class InMemoryTaskViewRepository implements ITaskViewRepository {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly taskItems = new Map<string, TaskItemRecord[]>();

  async insert(data: InsertTaskData): Promise<void> {
    if (this.tasks.has(data.id)) return;
    this.tasks.set(data.id, {
      id: data.id,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      projectId: data.projectId,
      dueDate: data.dueDate,
      estimatedDurationValue: data.estimatedDurationValue,
      estimatedDurationUnit: data.estimatedDurationUnit,
      scheduledDate: null,
      scheduledStartTime: null,
      startedAt: null,
      completedAt: null,
      recurrenceRule: null,
      status: 'ready',
      completionCount: 0,
    });
  }

  async markStarted(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.startedAt = new Date();
  }

  async markCompleted(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.completedAt = new Date();
  }

  async reschedule(id: string, nextDueDate: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.startedAt = null;
    task.completedAt = null;
    task.dueDate = nextDueDate;
    task.completionCount += 1;
  }

  async setSchedule(id: string, scheduledDate: string, scheduledStartTime: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.scheduledDate = scheduledDate;
    task.scheduledStartTime = scheduledStartTime;
  }

  async setRecurrence(id: string, recurrenceRule: unknown, dueDate: string | null): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.recurrenceRule = recurrenceRule;
    if (dueDate !== null) task.dueDate = dueDate;
  }

  async setDueDate(id: string, dueDate: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.dueDate = dueDate;
  }

  async setProjectId(id: string, projectId: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.projectId = projectId;
  }

  async updateFields(id: string, data: UpdateTaskData): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    if (data.name !== null) task.name = data.name;
    if (data.categoryId !== null) task.categoryId = data.categoryId;
    if (data.description !== null) task.description = data.description;
    if (data.estimatedDurationValue !== null) task.estimatedDurationValue = data.estimatedDurationValue;
    if (data.estimatedDurationUnit !== null) task.estimatedDurationUnit = data.estimatedDurationUnit;
    if (data.dueDate !== null) task.dueDate = data.dueDate;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;
    task.status = status;
  }

  async findById(id: string): Promise<TaskViewRow | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    return {
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      recurrenceRule: task.recurrenceRule,
    };
  }

  async getItemStatusesForTask(taskId: string): Promise<string[]> {
    return (this.taskItems.get(taskId) ?? []).map(r => r.itemStatus);
  }

  async insertItemRequirement(taskId: string, itemId: string, consumable: boolean, itemStatus: string): Promise<void> {
    const items = this.taskItems.get(taskId) ?? [];
    if (!items.some(r => r.itemId === itemId)) {
      items.push({ taskId, itemId, consumable, itemStatus });
      this.taskItems.set(taskId, items);
    }
  }

  async deleteItemRequirement(taskId: string, itemId: string): Promise<void> {
    const items = this.taskItems.get(taskId);
    if (!items) return;
    this.taskItems.set(taskId, items.filter(r => r.itemId !== itemId));
  }

  async updateItemStatusForItem(itemId: string, status: string): Promise<void> {
    for (const items of this.taskItems.values()) {
      for (const record of items) {
        if (record.itemId === itemId) record.itemStatus = status;
      }
    }
  }

  async getTaskIdsForItem(itemId: string): Promise<string[]> {
    const taskIds: string[] = [];
    for (const [taskId, items] of this.taskItems.entries()) {
      if (items.some(r => r.itemId === itemId)) taskIds.push(taskId);
    }
    return taskIds;
  }

  // Test-only read methods
  getTask(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  getTaskStatus(id: string): string | undefined {
    return this.tasks.get(id)?.status;
  }

  getTaskItems(taskId: string): TaskItemRecord[] {
    return this.taskItems.get(taskId) ?? [];
  }
}
