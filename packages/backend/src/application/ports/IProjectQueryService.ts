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
  priority: string;
  start_date: string | null;
  due_date: string | null;
  task_ids: string[];
  created_at: string;
  progress: number;
  display_status: 'draft' | 'planned' | 'active' | 'on_hold' | 'done' | 'off_track' | 'at_risk';
}

export interface IProjectQueryService {
  getAll(filter: ProjectFilter): Promise<ProjectView[]>;
  getById(id: string): Promise<ProjectView | null>;
}
