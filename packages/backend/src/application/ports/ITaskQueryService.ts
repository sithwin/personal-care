export interface TaskFilter {
  status?: string;
  categoryId?: string;
  sort?: 'dueDate' | 'duration' | 'category';
}

export interface RequiredItemView {
  item_id: string;
  consumable: boolean;
  item_status: string;
}

export interface AttachedResourceView {
  resource_id: string;
  title: string;
  type: string;
}

export interface TaskView {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  project_id: string | null;
  status: string;
  estimated_duration_value: number | null;
  estimated_duration_unit: string | null;
  due_date: string | null;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  recurrence_rule: object | null;
  next_due_date: string | null;
  completion_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  required_items: RequiredItemView[] | null;
  resources: AttachedResourceView[] | null;
}

export interface ITaskQueryService {
  getAll(filter: TaskFilter): Promise<TaskView[]>;
  getById(id: string): Promise<TaskView | null>;
}
