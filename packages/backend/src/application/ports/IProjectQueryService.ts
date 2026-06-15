export interface ProjectFilter {
  status?: string;
  categoryId?: string;
}

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  status: string;
  due_date: string | null;
  task_ids: string[];
  created_at: string;
}

export interface IProjectQueryService {
  getAll(filter: ProjectFilter): Promise<ProjectView[]>;
  getById(id: string): Promise<ProjectView | null>;
}
