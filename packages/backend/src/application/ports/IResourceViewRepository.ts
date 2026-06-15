export interface InsertResourceData {
  id: string;
  title: string;
  type: string;
  url: string | null;
  notes: string | null;
  categoryId: string | null;
}

export interface UpdateResourceData {
  title: string | null;
  url: string | null;
  notes: string | null;
}

export interface IResourceViewRepository {
  insert(data: InsertResourceData): Promise<void>;
  update(id: string, data: UpdateResourceData): Promise<void>;
  delete(id: string): Promise<void>;
  findTitleAndType(id: string): Promise<{ title: string; type: string } | null>;
  insertTaskResource(taskId: string, resourceId: string, title: string, type: string): Promise<void>;
  deleteTaskResource(taskId: string, resourceId: string): Promise<void>;
  appendTaskId(resourceId: string, taskId: string): Promise<void>;
  removeTaskId(resourceId: string, taskId: string): Promise<void>;
}
