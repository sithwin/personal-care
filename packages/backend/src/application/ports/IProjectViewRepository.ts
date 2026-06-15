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
}
