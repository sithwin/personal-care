export interface CategoryView {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  task_count: number;
  item_count: number;
  deleted: boolean;
}

export interface ICategoryQueryService {
  getAll(): Promise<CategoryView[]>;
  getById(id: string): Promise<CategoryView | null>;
}
