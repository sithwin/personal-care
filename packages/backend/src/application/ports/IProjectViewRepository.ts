export interface InsertProjectData {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  dueDate: string | null;
}

export interface IProjectViewRepository {
  insert(data: InsertProjectData): Promise<void>;
  appendTask(projectId: string, taskId: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  plan(id: string, startDate: string, endDate: string): Promise<void>;
  start(id: string, endDate: string | null): Promise<void>;
  pause(id: string): Promise<void>;
  resume(id: string): Promise<void>;
  updateMeta(id: string, data: { name?: string | null; description?: string | null; priority?: string | null }): Promise<void>;
}
